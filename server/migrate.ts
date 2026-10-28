import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const {Client}=pg;
if(!process.env.DATABASE_URL){console.error('DATABASE_URL is required');process.exit(1);}
const client=new Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {const sql=await readFile(new URL('../db/migrations/001_initial.sql',import.meta.url),'utf8');await client.query(sql);console.log('GoRide AI database migration applied.');}
finally {await client.end();}
