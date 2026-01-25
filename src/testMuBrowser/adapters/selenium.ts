
import { Session } from '../types.js';

export class SeleniumAdapter {
    async connect(session: Session) {
        console.log("Selenium Adapter: Connect functionality placeholder.");
        console.log("To use Selenium, connect your WebDriver to:", session.config.lambdatestOptions ? "https://hub.lambdatest.com/wd/hub" : "http://localhost:4444");
        // Returning connection info for user to use with their own Selenium client
        return {
            hubUrl: "https://hub.lambdatest.com/wd/hub", // Simplify for now
            capabilities: session.config.lambdatestOptions
        };
    }
}
