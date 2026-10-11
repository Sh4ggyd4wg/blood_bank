# BloodConnect

A blood donation management system using PostgreSQL, Node.js, Express and plain HTML/CSS/JavaScript. It manages donors, recipients, hospitals, blood banks, donations, inventory and requests. The interface is preserved from the supplied project.

## Requirements

- A Windows, macOS or Linux computer with Node.js 20 or newer and npm.
- PostgreSQL installed and running; the connection user must own the project database and be able to create its tables.
- A web browser. There is no frontend build step, Docker requirement or extra database service.

## Start the application

1. Extract the ZIP. Open a terminal inside **BloodConnect**, where `package.json` is located.
2. Run these commands one at a time. The installation command needs internet access:

   ```bash
   npm install
   npm start
   ```

3. On the first run, answer the terminal prompts:

   | Prompt | What to enter |
   |---|---|
   | PostgreSQL host | `localhost` for a local installation |
   | PostgreSQL port | Usually `5432` |
   | PostgreSQL username | Your actual PostgreSQL login; the suggested default is `postgres` |
   | PostgreSQL password | Your database password, or Enter if this connection permits no password |
   | Project database | Accept `bloodconnect` for a fresh project, or enter another name |
   | Website port | Usually `3000` |

4. Setup creates the database if your PostgreSQL user is allowed to, then creates tables and demonstration accounts. It does not delete existing databases or reset an initialized project.
5. Open **http://127.0.0.1:3000**, or the address printed in Terminal if you chose a different website port. Keep Terminal open while using the app.

For later runs, use **`npm start`**. Stop with **Ctrl+C**. To change connection details or ports, use **`npm run setup`**, then start again. All commands are the same on Windows, macOS and Linux.

Connection settings are saved locally in `config.json`. It contains the PostgreSQL password: keep it private and exclude it when sharing the project. It is generated during setup and is not supplied in the ZIP.

### Existing databases

Use a new empty database for the original older project; this package does not import or migrate its data. Setup refuses unrecognized databases that already contain tables and leaves them untouched. An existing database created by the previous simplified version can be reused by entering its exact name and credentials; existing accounts and records are retained.

## Website accounts

A fresh database includes these local demonstration accounts. These passwords are separate from your PostgreSQL password.

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin123!` | Administrator |
| `staff` | `Staff123!` | Hospital staff, linked to General Hospital |
| `donor` | `Donor123!` | Demo Donor, blood group O+ |

When reusing an existing database, use that database's existing account passwords. The app does not reset them. Administrators can create additional accounts with passwords chosen in the application.

## Roles

| Role | Permitted actions |
|---|---|
| Administrator | Register and verify donors; edit permitted donor details; record completed donations; view all inventory and requests; approve, reject or dispatch requests; manage accounts; generate and print reports |
| Hospital staff | View stock; submit requests for their assigned hospital; view that hospital's recipients and request statuses |
| Donor | View their own profile, donation history and waiting-period result; edit their own name, email, phone and address |

Public signup creates an unverified donor account only. Hospitals, blood banks and recipients are records, not extra login roles. Donor accounts link to one donor; staff accounts link to one hospital. Permissions are enforced by the server.

## Demonstrate the workflow

1. Log in as admin. Open Donations, select the verified Demo Donor and Central Blood Bank, enter a future expiry date, confirm completion and record the donation.
2. Inventory now shows one O+ unit at that bank. The donor enters the waiting period.
3. Log in as staff. Submit a request for a fictional new recipient: O+, Central Blood Bank, one unit.
4. Log in as admin. Approve the request, then dispatch it. Inventory decreases by one unit.
5. Log in as donor to view the saved history. Admin can generate a report from Administration.

For another donation, register and verify another donor. Restarting the application does not clear data. New registrations require administrator verification before they can donate.

## Database rules

- Eight tables: the seven business entities plus `users` for authentication. Primary keys, foreign keys, checks and unique constraints protect basic integrity.
- Donation history, last donation date and the inventory addition are saved in one transaction. A failure rolls back the whole operation.
- Dispatch locks the request and matching inventory, uses the earliest-expiring usable batches and deducts stock in one transaction. Insufficient stock or repeat dispatch is rejected.
- Approval checks availability but does not reserve stock. Dispatch checks again. The supplied interface supports pending → approved → dispatched, or pending → rejected.
- Staff cannot act for another hospital. Donors cannot view another donor's profile or alter their own verification.
- Referenced donor history is protected from deletion. Deleting a login does not delete the donor's donation records.
- Views provide usable inventory and donation totals; a trigger guards request status transitions. The full definitions are in `schema.sql`.
- The project retains age 18–65, a 56-day waiting interval, one donation = 0.45 L = one unit, exact blood-group matching and availability through the expiry date. Admin supplies the expiry date. These are academic assumptions, not clinical screening or compatibility rules.
- Some original stored values remain redundant, including copied blood groups and the cached last donation date. Do not describe the complete schema as fully BCNF.

## Files

| File | Purpose |
|---|---|
| `server.js` | Starts setup and the local website |
| `database.js` | PostgreSQL connection settings and initialization |
| `schema.sql` | Tables, constraints, indexes, views, trigger and initial records |
| `app.js` | Connects API routes and serves the browser files |
| `routes.js` | Database operations, grouped by feature |
| `auth.js` | Login sessions and role checks |
| `helpers.js` | Validation, eligibility, transactions and password hashing |
| `public/` | Original HTML, CSS and browser JavaScript, unchanged |
| `package.json`, `package-lock.json` | Runtime dependencies and npm commands |

## Common setup problems

- **Cannot find package.json:** open Terminal in the extracted BloodConnect folder, not its parent folder.
- **Connection refused:** start PostgreSQL and check the host/port. Run `npm run setup` to correct them.
- **Password authentication failed / password must be a string:** enter the actual PostgreSQL password. An empty password works only when the server allows password-free authentication for that connection. Set or update the role password through an authorized PostgreSQL session if needed; do not disable authentication to fix the app.
- **Username does not exist:** use the username from your working PostgreSQL connection. It is not necessarily `postgres`.
- **Permission denied to create a database:** create an empty database in pgAdmin, assign your connection user as its owner, then enter that name in setup.
- **Database contains another project:** choose a new database name with `npm run setup`. No existing records are deleted.
- **Port already in use:** stop the other app or choose another website port with `npm run setup`.
- **No eligible donors:** verify a donor as admin and check the age/waiting conditions.
- **Request cannot be dispatched:** check the selected bank, exact group, expiry and whole-unit quantity.

Sessions are held in memory; restarting the server logs users out but keeps database records. The server listens on the local computer. The included sample accounts are for local demonstration. No automated verification files or additional report/document folders are included.
