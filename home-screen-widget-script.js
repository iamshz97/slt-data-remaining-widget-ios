// Define constants
const LOGIN_URL = "https://omniscapp.slt.lk/slt/ext/api/Account/Login";
const DASHBOARD_URL =
  "https://omniscapp.slt.lk/slt/ext/api/BBVAS/UsageSummary?subscriberID=";
const CHANNEL_ID = "WEB";
const CLIENT_ID = "b7402e9d66808f762ccedbe42c20668e";
const LOGO_URL = "https://i.ibb.co/BC5Tn8N/IMG-4078.png";

// Notification thresholds and messages
const NOTIFICATION_THRESHOLDS = [75, 50, 25, 10];
const NOTIFICATION_MESSAGES = {
  75: {
    title: "⚠️ Data Usage Alert",
    body: "You've used 75% of your data. Consider monitoring your usage."
  },
  50: {
    title: "📊 Halfway There",
    body: "50% of your data has been used. You're halfway through your plan."
  },
  25: {
    title: "🔔 Low Data Warning",
    body: "Only 25% of your data remaining. Use it wisely!"
  },
  10: {
    title: "🚨 Critical Data Alert",
    body: "Only 10% of your data left! Consider upgrading or reducing usage."
  }
};

// Function to get the username, password, and subscriber ID from a pop-up
async function getUsernamePasswordAndSubscriberID() {
  const alert = new Alert();
  alert.title = "Login";
  alert.message = "Please enter your username, password, and subscriber ID.";

  alert.addTextField("Username (e.g. john@mail.com)", "");
  alert.addSecureTextField("Password", "");
  alert.addTextField("Subscriber ID (e.g. 94812232278)", "");

  alert.addAction("Submit");
  alert.addCancelAction("Cancel");

  const alertResult = await alert.presentAlert();

  if (alertResult === 0) {
    const username = alert.textFieldValue(0);
    const password = alert.textFieldValue(1);
    const subscriberID = alert.textFieldValue(2);

    Keychain.set("slt_username", username);
    Keychain.set("slt_password", password);
    Keychain.set("slt_subscriberID", subscriberID);

    return { username, password, subscriberID };
  } else {
    throw new Error("User canceled login.");
  }
}

// Function to get the saved username, password, and subscriber ID or prompt for new ones
async function getSavedCredentials() {
  let username, password, subscriberID;

  if (Keychain.contains("slt_username")) {
    username = Keychain.get("slt_username");
  }
  if (Keychain.contains("slt_password")) {
    password = Keychain.get("slt_password");
  }
  if (Keychain.contains("slt_subscriberID")) {
    subscriberID = Keychain.get("slt_subscriberID");
  }

  if (!username || !password || !subscriberID) {
    ({ username, password, subscriberID } =
      await getUsernamePasswordAndSubscriberID());
  }

  return { username, password, subscriberID };
}

async function resetKeyChainParams() {
  Keychain.remove("slt_username");
  Keychain.remove("slt_password");
  Keychain.remove("slt_subscriberID");
  Keychain.remove("slt_accessToken");
}

// Function to get refresh interval from user (minimum 15 minutes)
async function getRefreshInterval() {
  const MIN_REFRESH_MINUTES = 15;
  
  // Check if refresh interval is already saved
  if (Keychain.contains("slt_refreshIntervalMinutes")) {
    const savedInterval = parseInt(Keychain.get("slt_refreshIntervalMinutes"));
    if (savedInterval >= MIN_REFRESH_MINUTES) {
      return savedInterval;
    }
  }
  
  // Prompt user for refresh interval
  let refreshInterval = null;
  while (!refreshInterval || refreshInterval < MIN_REFRESH_MINUTES) {
    const alert = new Alert();
    alert.title = "Widget Refresh Interval";
    alert.message = `How often should the widget refresh? (Minimum: ${MIN_REFRESH_MINUTES} minutes)`;
    
    alert.addTextField("Refresh interval in minutes", "30");
    alert.addAction("Set");
    alert.addCancelAction("Cancel");
    
    const alertResult = await alert.presentAlert();
    
    if (alertResult === 0) {
      const inputValue = alert.textFieldValue(0);
      refreshInterval = parseInt(inputValue);
      
      if (isNaN(refreshInterval) || refreshInterval < MIN_REFRESH_MINUTES) {
        const errorAlert = new Alert();
        errorAlert.title = "Invalid Input";
        errorAlert.message = `Please enter a number that is at least ${MIN_REFRESH_MINUTES} minutes.`;
        errorAlert.addAction("OK");
        await errorAlert.presentAlert();
        continue;
      }
      
      // Save the refresh interval
      Keychain.set("slt_refreshIntervalMinutes", refreshInterval.toString());
      return refreshInterval;
    } else {
      // User canceled, use default minimum
      refreshInterval = MIN_REFRESH_MINUTES;
      Keychain.set("slt_refreshIntervalMinutes", refreshInterval.toString());
      return refreshInterval;
    }
  }
}

// Function to get today's date in YYYY-MM-DD format
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Function to check if notification was sent today for a threshold
function wasNotificationSentToday(threshold) {
  const key = `cache_key_date_shown_${threshold}`;
  if (Keychain.contains(key)) {
    const storedDate = Keychain.get(key);
    const todayDate = getTodayDateString();
    if (storedDate === todayDate) {
      return true;
    } else {
      // Clear old entry if date doesn't match
      Keychain.remove(key);
    }
  }
  return false;
}

// Function to mark notification as sent for today
function markNotificationSentToday(threshold) {
  const key = `cache_key_date_shown_${threshold}`;
  const todayDate = getTodayDateString();
  Keychain.set(key, todayDate);
}

// Function to get cached access token
function getCachedAccessToken() {
  if (Keychain.contains("slt_accessToken")) {
    return Keychain.get("slt_accessToken");
  }
  return null;
}

// Function to save access token to cache
function saveAccessToken(accessToken) {
  Keychain.set("slt_accessToken", accessToken);
}

// Function to login and get the access token
async function loginAndGetAccessToken(username, password) {
  const request = new Request(LOGIN_URL);
  request.method = "POST";
  request.headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-IBM-Client-Id": CLIENT_ID,
  };
  request.body = `username=${encodeURIComponent(
    username
  )}&password=${encodeURIComponent(password)}&channelID=${encodeURIComponent(
    CHANNEL_ID
  )}`;
  const response = await request.load();
  const jsonResponse = JSON.parse(response.toRawString());

  if (jsonResponse.errorMessage) {
    await resetKeyChainParams();

    throw new Error(jsonResponse.errorMessage);
  }

  const accessToken = jsonResponse.accessToken;
  saveAccessToken(accessToken);
  return accessToken;
}

// Function to get the package summary
async function getPackageSummary(accessToken, subscriberID) {
  const request = new Request(DASHBOARD_URL + subscriberID);
  request.headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-IBM-Client-Id": CLIENT_ID,
  };
  let response;
  let jsonResponse;
  
  try {
    response = await request.load();
    jsonResponse = JSON.parse(response.toRawString());
  } catch (error) {
    // If request fails, it might be an auth error
    Keychain.remove("slt_accessToken");
    throw new Error("AUTH_ERROR");
  }

  // Check if authentication failed based on error message
  const isAuthError = jsonResponse.errorMessege && (
    jsonResponse.errorMessege.toLowerCase().includes("unauthorized") ||
    jsonResponse.errorMessege.toLowerCase().includes("token") ||
    jsonResponse.errorMessege.toLowerCase().includes("authentication") ||
    jsonResponse.errorMessege.toLowerCase().includes("expired")
  );

  if (isAuthError) {
    // Clear cached token on auth error
    Keychain.remove("slt_accessToken");
    throw new Error("AUTH_ERROR");
  }

  if (!jsonResponse.isSuccess || jsonResponse.errorMessege) {
    if (jsonResponse.errorMessege) {
      if (jsonResponse.errorMessege.includes("No privilege")) {
        throw new Error("Invalid subscriber ID.");
      } else {
        throw new Error(jsonResponse.errorMessege);
      }
    } else {
      throw new Error("Failed to fetch package summary.");
    }
  }

  const dataBundle = jsonResponse.dataBundle;

  let packageSummary;

  if (dataBundle.my_package_summary.limit === null) {
    packageSummary = {
      limit: dataBundle.vas_data_summary.limit,
      used: dataBundle.vas_data_summary.used,
      volume_unit: dataBundle.vas_data_summary.volume_unit,
    };
  } else {
    packageSummary = dataBundle.my_package_summary;
  }

  return packageSummary;
}

// Function to check and send notifications for data usage thresholds
async function checkAndSendNotifications(packageSummary) {
  // Calculate current usage percentage
  const currentPercentage = (packageSummary.used / packageSummary.limit) * 100;
  
  // Get last known percentage from Keychain
  let lastPercentage = null;
  if (Keychain.contains("slt_lastUsagePercentage")) {
    lastPercentage = parseFloat(Keychain.get("slt_lastUsagePercentage"));
  }
  
  // Check each threshold in descending order
  for (const threshold of NOTIFICATION_THRESHOLDS) {
    // Check if we've crossed below the threshold
    // Only trigger if we have a previous percentage and we crossed from above
    const crossedBelow = lastPercentage !== null && 
                        currentPercentage <= threshold && 
                        lastPercentage > threshold;
    
    // If crossed below and not notified today, send notification
    if (crossedBelow && !wasNotificationSentToday(threshold)) {
      const message = NOTIFICATION_MESSAGES[threshold];
      
      const notification = new Notification();
      notification.title = message.title;
      notification.body = message.body;
      notification.setTriggerDate(new Date(Date.now() + 1000)); // 1 second from now
      
      await notification.schedule();
      markNotificationSentToday(threshold);
    }
  }
  
  // Update last known percentage
  Keychain.set("slt_lastUsagePercentage", currentPercentage.toString());
}

async function createWidget(packageSummary) {
  const widget = new ListWidget();

  const isDarkMode = Device.isUsingDarkAppearance();
  widget.backgroundColor = isDarkMode ? Color.black() : Color.white();
  const textColor = isDarkMode ? Color.gray() : Color.black();
  const progressBarColor = isDarkMode ? Color.blue() : Color.blue();

  widget.setPadding(16, 16, 16, 16);

  const titleStack = widget.addStack();
  titleStack.layoutHorizontally();
  titleStack.centerAlignContent();

  const logoReq = new Request(LOGO_URL);
  const logoImg = await logoReq.loadImage();
  const logo = titleStack.addImage(logoImg);
  logo.imageSize = new Size(50, 50);

  titleStack.addSpacer();
  logo.rightAlignImage();

  const titleText = titleStack.addText("WiFi");
  titleText.textColor = textColor;
  titleText.font = new Font("Helvetica Neue", 18);

  widget.addSpacer(12);

  const textFont = new Font("Arial", 14);

  const limitText = widget.addText(
    `Limit: ${packageSummary.limit} ${packageSummary.volume_unit}`
  );
  limitText.textColor = textColor;
  limitText.font = textFont;

  const usedText = widget.addText(
    `Used: ${packageSummary.used} ${packageSummary.volume_unit}`
  );
  usedText.textColor = progressBarColor;
  usedText.font = textFont;

  widget.addSpacer(12);

  const progressBarWidth = 200;
  const progressBarHeight = 10;
  const usedPercentage = (packageSummary.used / packageSummary.limit) * 100;

  const context = new DrawContext();
  context.size = new Size(progressBarWidth, progressBarHeight);

  context.setFillColor(isDarkMode ? Color.darkGray() : Color.lightGray());
  context.fill(new Rect(0, 0, progressBarWidth, progressBarHeight));

  context.setFillColor(progressBarColor);
  context.fill(
    new Rect(0, 0, progressBarWidth * (usedPercentage / 100), progressBarHeight)
  );

  const progressImage = context.getImage();
  const progress = widget.addImage(progressImage);

  // Get refresh interval and set refresh date
  const refreshIntervalMinutes = await getRefreshInterval();
  widget.refreshAfterDate = new Date(Date.now() + 1000 * 60 * refreshIntervalMinutes);

  return widget;
}

// Main function to run the script
async function main() {
  try {
    const { username, password, subscriberID } = await getSavedCredentials();
    
    // Try to use cached access token first
    let accessToken = getCachedAccessToken();
    
    // If no cached token, fetch a new one
    if (!accessToken) {
      accessToken = await loginAndGetAccessToken(username, password);
    }
    
    try {
      const packageSummary = await getPackageSummary(accessToken, subscriberID);
      console.log(packageSummary);

      // Check and send notifications for data usage thresholds
      await checkAndSendNotifications(packageSummary);

      // Create and display the widget
      const widget = await createWidget(packageSummary);
      if (config.runsInWidget) {
        Script.setWidget(widget);
      } else {
        widget.presentMedium();
      }
    } catch (error) {
      // If auth error, try to get a new token and retry
      if (error.message === "AUTH_ERROR") {
        accessToken = await loginAndGetAccessToken(username, password);
        const packageSummary = await getPackageSummary(accessToken, subscriberID);
        console.log(packageSummary);

        // Check and send notifications for data usage thresholds
        await checkAndSendNotifications(packageSummary);

        // Create and display the widget
        const widget = await createWidget(packageSummary);
        if (config.runsInWidget) {
          Script.setWidget(widget);
        } else {
          widget.presentMedium();
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error(error);
  }
}

main();
