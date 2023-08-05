// Define constants
const LOGIN_URL = "https://omniscapp.slt.lk/mobitelint/slt/api/Account/Login";
const DASHBOARD_URL =
  "https://omniscapp.slt.lk/mobitelint/slt/api/BBVAS/UsageSummary?subscriberID=";
const CHANNEL_ID = "WEB";
const CLIENT_ID = "41aed706-8fdf-4b1e-883e-91e44d7f379b";
const LOGO_URL = "https://i.ibb.co/BC5Tn8N/IMG-4078.png";

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

  return jsonResponse.accessToken;
}

// Function to get the package summary
async function getPackageSummary(accessToken, subscriberID) {
  const request = new Request(DASHBOARD_URL + subscriberID);
  request.headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-IBM-Client-Id": CLIENT_ID,
  };
  const response = await request.load();
  const jsonResponse = JSON.parse(response.toRawString());

  if (jsonResponse.errorMessege) {
    await resetKeyChainParams();

    if (jsonResponse.errorMessege.includes("No privilege")) {
      throw new Error("Invalid subscriber ID.");
    } else {
      throw new Error(jsonResponse.errorMessege);
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

  widget.refreshAfterDate = new Date(Date.now() + 1000 * 60 * 30);

  return widget;
}

// Main function to run the script
async function main() {
  try {
    const { username, password, subscriberID } = await getSavedCredentials();
    const accessToken = await loginAndGetAccessToken(username, password);
    const packageSummary = await getPackageSummary(accessToken, subscriberID);
    console.log(packageSummary);

    // Create and display the widget
    const widget = await createWidget(packageSummary);
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      widget.presentMedium();
    }
  } catch (error) {
    console.error(error);
  }
}

main();
