# Home finance management

Living description of the home-finance side of the app. Add a section only after the behavior has been checked in the code.

## Upcoming renewals digest email

Scheduled email of upcoming renewals, birthdays, anniversaries, and special dates. Settings are at `/dashboard/upcoming-renewals/email-settings`. The message goes to the account email unless a recipient override is saved.

Subject:

- English: `Upcoming renewals, birthdays, anniversaries & special dates (N)`
- Hebrew: `חידושים, ימי הולדת, יום נישואין ומועדים מיוחדים (N)`

`N` is the number of rows. Language follows the user’s UI language.

The window is the next `days_ahead` days, including today (default 30). The email also includes overdue annual subscriptions, open tasks, and donations whose date is already past. Hebrew calendar dates are shown by their nearest Gregorian occurrence this year.

Each line is the date, the item details, and how many days away it is (`Today`, `In N days`, or an overdue label with how many days ago). Overdue timing is shown in red in the HTML version.

Topic names stay the English category keys used in the data (`Birthday`, `Anniversary`, `Special date`, `Subscription`, `Identity`, `Credit card`, `Insurance`, `Savings policy`, `Car license`, `Car service`, `Rental`, `Utility`, `Task`, `Donation`, `Loan`, `Warranty`), including when the rest of the email is Hebrew.

Layout is saved per user:

- **Grouped by topic** (default). Headings follow that category order. Lines under a heading do not repeat the topic.
- **Flat list by date.** One list, earliest date first (overdue before today). Same-day rows then follow the category order, then item name. Each line includes the topic. In HTML the topic is an inline colored label. Plain text includes the same topic word without color.

Sending the digest, when that user’s Google Calendar is already connected, turns family-date sync on if it was off and writes birthdays, anniversaries, and special dates to the calendar. The same settings page can sync those dates immediately without waiting for the email.
