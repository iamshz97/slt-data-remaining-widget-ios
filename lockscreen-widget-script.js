// Define constants
const LOGIN_URL = "https://omniscapp.slt.lk/mobitelint/slt/api/Account/Login";
const DASHBOARD_URL =
  "https://omniscapp.slt.lk/mobitelint/slt/api/BBVAS/UsageSummary?subscriberID=";
const CHANNEL_ID = "WEB";
const CLIENT_ID = "41aed706-8fdf-4b1e-883e-91e44d7f379b";
const LOGO_URL = "https://i.ibb.co/BC5Tn8N/IMG-4078.png";
const DEBUG = false;

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

async function getService(name, url, forceDownload) {
  const fm = FileManager.local();
  const scriptDir = module.filename.replace(
    fm.fileName(module.filename, true),
    ""
  );
  let serviceDir = fm.joinPath(scriptDir, "lib/service/" + name);

  if (!fm.fileExists(serviceDir)) {
    fm.createDirectory(serviceDir, true);
  }

  let libFile = fm.joinPath(scriptDir, "lib/service/" + name + "/index.js");

  if (fm.fileExists(libFile) && !forceDownload) {
    fm.downloadFileFromiCloud(libFile);
  } else {
    // download once
    let indexjs = await loadText(url);
    fm.write(libFile, indexjs);
  }

  let service = importModule("lib/service/" + name);

  return service;
}

async function createWidget(packageSummary) {
  const widget = new ListWidget();

  // Get Progress Circle service
  let ProgressCircleService = await getService(
    "ProgressCircle",
    "https://gist.githubusercontent.com/Sillium/4210779bc2d759b494fa60ba4f464bd8/raw/9e172bac0513cc3cf0e70f3399e49d10f5d0589c/ProgressCircleService.js",
    DEBUG
  );

  // Calculate used percentage
  let percent = (packageSummary.used / packageSummary.limit) * 100;

  let progressStack = await ProgressCircleService.drawArc(widget, percent);

  // Get logo image
  let logoReq = new Request(LOGO_URL);
  let logoImg = await logoReq.loadImage();
  let logo = progressStack.addImage(logoImg);
  logo.imageSize = new Size(26, 26);
  logo.imageOpacity = 1;

  widget.presentAccessoryCircular(); // Does not present correctly
  Script.setWidget(widget);
  Script.complete();
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
