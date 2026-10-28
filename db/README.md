# PostgreSQL setup

1. Install PostgreSQL or create a managed PostgreSQL database.
2. Create database `goride_ai`.
3. Put a valid connection string in `.env` as `DATABASE_URL=...`.
4. Install the PostgreSQL driver if you extend the migration runner: `npm install pg` and `npm install -D @types/pg`.
5. Run `npm run db:migrate`.

The current demo API uses in-memory data intentionally and does not yet persist API operations to PostgreSQL. The schema is the persistence foundation for the next integration step. Do not represent this starter as production-ready until repository, authorization, transaction, and test coverage are complete.
