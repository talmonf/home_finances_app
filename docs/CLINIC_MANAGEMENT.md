# Clinic management

Living description of the clinic side of the app. Add a section only after the behavior has been checked in the code.

## Clinic digest email

Scheduled email of upcoming clinic appointments and the visit schedule. Settings are the “Clinic digest email” section on `/dashboard/private-clinic/settings`. It uses the same outbound email setup as the other household digests (Resend). The digest is off until it is enabled. The default window for scheduled appointments is 90 days ahead. The message goes to the account email unless a recipient override is saved.

Subject:

- English: `Clinic: X appointments, Y upcoming visits`
- Hebrew: `מרפאה: X תורים, Y ביקורים קרובים`

`X` is the number of scheduled appointments in the window. `Y` is upcoming visits plus clients who still need a first visit.

The email has these parts:

- **Scheduled appointments.** Start time, client, job, and visit type. An appointment note is included when one is set.
- **Upcoming visits.** Next due date (or “On hold”), an overdue or due-today mark when it applies, client, job, program, a scheduled appointment when one exists, that appointment’s note when set, and the last visit date.
- **Needs a first visit.** Shown only when such clients exist. Each line is the client, plus a scheduled appointment and its note when one is set.

When there is nothing to report, the email says so and still links to appointments and upcoming visits.
