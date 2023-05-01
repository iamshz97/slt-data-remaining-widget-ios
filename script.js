// Define constants
const LOGIN_URL = "https://omniscapp.slt.lk/mobitelint/slt/api/Account/Login";
const DASHBOARD_URL =
  "https://omniscapp.slt.lk/mobitelint/slt/api/BBVAS/GetDashboardVASBundles?subscriberID=94812232278";
const USERNAME = "xxxxxxxx@gmail.com";
const PASSWORD = "xxxxxx234234dsf";
const CHANNEL_ID = "WEB";
const CLIENT_ID = "41aed706-8fdf-4b1e-883e-91e44d7f379b";
const LOGO_URL =
  "https://play-lh.googleusercontent.com/qCEwpUDhKk1UtqGGgKFXQR9hhve9xw9fKg39pHbMAsVkgwSmfUGlidInEtrZEzSwdGo";

// Function to login and get the access token
async function loginAndGetAccessToken() {
  const request = new Request(LOGIN_URL);
  request.method = "POST";
  request.headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "X-IBM-Client-Id": CLIENT_ID,
  };
  request.body = `username=${encodeURIComponent(
    USERNAME
  )}&password=${encodeURIComponent(PASSWORD)}&channelID=${encodeURIComponent(
    CHANNEL_ID
  )}`;
  const response = await request.load();
  const jsonResponse = JSON.parse(response.toRawString());
  return jsonResponse.accessToken;
}

// Function to get the package summary
async function getPackageSummary(accessToken) {
  const request = new Request(DASHBOARD_URL);
  request.headers = {
    Authorization: `Bearer ${accessToken}`,
    "X-IBM-Client-Id": CLIENT_ID,
  };
  const response = await request.load();
  const jsonResponse = JSON.parse(response.toRawString());
  return jsonResponse.dataBundle.package_summary;
}

// Function to create and style the widget
// Modify the createWidget function
async function createWidget(packageSummary) {
  const widget = new ListWidget();

  // Set widget background color to white
  widget.backgroundColor = Color.white();

  // Set widget padding
  widget.setPadding(16, 16, 16, 16);

  // Create horizontal stack for logo and title
  const titleStack = widget.addStack();
  titleStack.layoutHorizontally();
  titleStack.centerAlignContent();

  // Add logo
  const logoReq = new Request(LOGO_URL);
  const logoImg = await logoReq.loadImage();
  const logo = titleStack.addImage(logoImg);
  logo.imageSize = new Size(50, 50);
  logo.rightAlignImage();
  logo.applyFillingContentMode();

  // Add spacing between logo and title
  titleStack.addSpacer(8);

  // Add title text
  const titleText = titleStack.addText("Usage");
  titleText.textColor = Color.black();
  titleText.font = Font.boldSystemFont(16);
  titleText.lineLimit = 2; // Set the maximum number of lines for the title

  // Add spacing
  widget.addSpacer(8);

  // Add limit and used text
  const limitText = widget.addText(
    `Limit: ${packageSummary.limit} ${packageSummary.volume_unit}`
  );
  limitText.textColor = Color.black();
  limitText.font = Font.semiboldSystemFont(16);

  const usedText = widget.addText(
    `Used: ${packageSummary.used} ${packageSummary.volume_unit}`
  );
  usedText.textColor = Color.blue(); // SLT Mobitel blue
  usedText.font = Font.semiboldSystemFont(16);

  // Add spacing
  widget.addSpacer(8);

  // Add progress bar
  const progressBarWidth = 200;
  const progressBarHeight = 10;
  const usedPercentage = (packageSummary.used / packageSummary.limit) * 100;

  const context = new DrawContext();
  context.size = new Size(progressBarWidth, progressBarHeight);

  // Draw background bar
  context.setFillColor(Color.lightGray());
  context.fill(new Rect(0, 0, progressBarWidth, progressBarHeight));

  // Draw progress bar
  context.setFillColor(Color.blue()); // SLT Mobitel blue
  context.fill(
    new Rect(0, 0, progressBarWidth * (usedPercentage / 100), progressBarHeight)
  );

  const progressImage = context.getImage();
  const progress = widget.addImage(progressImage);

  // Refresh interval
  widget.refreshAfterDate = new Date(Date.now() + 1000 * 60 * 30); // Refresh after 30 minutes

  return widget;
}

// Main function to run the script
async function main() {
  try {
    const accessToken = await loginAndGetAccessToken();
    const packageSummary = await getPackageSummary(accessToken);
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
