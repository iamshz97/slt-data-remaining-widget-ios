# SLT Mobitel Data Usage Widget 📱💻🌐

This repository contains the code for a Scriptable widget that displays the remaining daily data usage for SLT Mobitel users. The widget fetches data from the SLT Mobitel API and presents it in a visually appealing and easy-to-understand format. It has a modern design that matches the SLT Mobitel theme, and it updates automatically every 30 minutes.

## Features 🌟

- Displays remaining daily data usage for SLT Mobitel users
- Modern design with SLT Mobitel theme and colors
- Visual progress bar for data usage
- Automatic updates every 30 minutes

## How it works ⚙️

1. The widget logs into the SLT Mobitel API using your account credentials (username and password) and retrieves an access token.
2. The widget fetches your data usage summary, including the total limit and used data in GB.
3. The data is displayed in a visually appealing widget with a progress bar indicating the percentage of data used.
4. The widget updates automatically every 30 minutes to keep the data usage information up-to-date.

## Usage 📖

1. Download and install the [Scriptable app](https://apps.apple.com/us/app/scriptable/id1405459188) on your iOS device.
2. Create a new script and copy the code from this repository.
3. Replace the `USERNAME`, `PASSWORD`, and `LOGO_URL` constants with your SLT Mobitel account credentials and the logo URL (or local file path) respectively.
4. Run the script in the Scriptable app, and the widget will be displayed.
5. To add the widget to your home screen, press and hold an empty space on the home screen, tap the "+" button, and select "Scriptable". Choose the size of the widget you want to add, then tap "Add Widget". Finally, tap "Done".

## Customization 💅

You can customize the widget by modifying the colors, fonts, and other elements of the design in the `createWidget` function. Feel free to make any changes you'd like to better suit your preferences or match your device's theme.

## Disclaimer 🚨

Please make sure you don't share the script with your SLT Mobitel credentials (username and password) publicly. Keep your credentials secure and only use them on trusted devices.

## License 📄

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments 👏

Thanks to [SLT Mobitel](https://www.mobitel.lk/) for providing the API to fetch data usage information.

---

Enjoy your new SLT Mobitel Data Usage Widget! 🎉 If you have any questions or suggestions, feel free to open an issue or submit a pull request.
