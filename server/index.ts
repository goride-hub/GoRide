import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

const app=express();
app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:'1mb'}));
const demo=process.env.DEMO_MODE!=='false';
const sessions=new Map<string,{phone:string;role:string}>();
const bookings:any[]=[];
const tickets:any[]=[];
const quotes:any[]=[];
const rides=[
 {id:'mini',name:'Go Mini',base:35,perKm:12,perMin:1.4,eta:3},
 {id:'sedan',name:'Go Sedan',base:55,perKm:15,perMin:1.8,eta:5},
 {id:'xl',name:'Go XL',base:85,perKm:19,perMin:2.2,eta:7},
 {id:'bike',name:'Go Bike',base:18,perKm:6,perMin:.7,eta:2},
 {id:'electric',name:'Go Electric',base:45,perKm:13,perMin:1.5,eta:6}
];
app.get('/api/health',(_req,res)=>res.json({ok:true,mode:demo?'demo':'production',service:'GoRide AI API'}));
app.get('/api/config',(_req,res)=>res.json({demoMode:demo,liveMaps:false,liveDispatch:false,payments:'sandbox-placeholder',supportedLanguages:['en','te']}));
const otpSchema=z.object({phone:z.string().min(7).max(20)});
app.post('/api/auth/request-otp',(req,res)=>{const parsed=otpSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Enter a valid phone number.'});if(!demo)return res.status(501).json({error:'Connect an OTP provider before enabling authentication.'});res.json({ok:true,message:'Demo OTP requested. Use 123456 in demo mode.',demoOtp:'123456'});});
app.post('/api/auth/verify-otp',(req,res)=>{const parsed=z.object({phone:z.string().min(7).max(20),otp:z.string().min(4).max(8)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid input.'});if(!demo||parsed.data.otp!=='123456')return res.status(401).json({error:'OTP verification failed.'});const token=randomUUID();sessions.set(token,{phone:parsed.data.phone,role:'passenger'});res.json({ok:true,token,user:{phone:parsed.data.phone,role:'passenger'},warning:'Demo session token; replace with secure HTTP-only session cookies.'});});
app.get('/api/rides',(_req,res)=>res.json({items:rides,simulated:true}));
const quoteSchema=z.object({pickup:z.string().min(1).max(250),destination:z.string().min(1).max(250),distance:z.number().min(.1).max(500),minutes:z.number().int().min(1).max(600)});
app.post('/api/quotes',(req,res)=>{const parsed=quoteSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid quote request.',details:parsed.error.flatten()});const {pickup,destination,distance,minutes}=parsed.data;const items=rides.map(ride=>{const base=ride.base,distanceFare=ride.perKm*distance,timeFare=ride.perMin*minutes,demand=0,fees=8,tax=(base+distanceFare+timeFare+demand+fees)*.05;return {rideId:ride.id,rideName:ride.name,pickup,destination,distance,minutes,base,distanceFare,timeFare,demand,fees,tax,total:Math.round((base+distanceFare+timeFare+demand+fees+tax)*100)/100,estimate:true,simulated:true};});quotes.push({at:new Date().toISOString(),items});res.json({items,disclaimer:'Estimates only. No live traffic, route or demand data is connected.'});});
const bookingSchema=z.object({pickup:z.string().min(1).max(250),destination:z.string().min(1).max(250),rideId:z.string(),estimatedFare:z.number().nonnegative().max(100000),distance:z.number().positive().max(500),minutes:z.number().positive().max(600)});
app.get('/api/bookings',(_req,res)=>res.json({items:bookings,simulated:true}));
app.post('/api/bookings',(req,res)=>{const parsed=bookingSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid booking details.',details:parsed.error.flatten()});const ride=rides.find(r=>r.id===parsed.data.rideId);if(!ride)return res.status(400).json({error:'Unknown ride category.'});const booking={id:'GR-'+randomUUID().slice(0,8).toUpperCase(),...parsed.data,rideName:ride.name,status:'requested',createdAt:new Date().toISOString(),simulated:true};bookings.unshift(booking);res.status(201).json({booking,disclaimer:'Demo booking only. No driver has been dispatched.'});});
app.patch('/api/bookings/:id/status',(req,res)=>{const schema=z.object({status:z.enum(['requested','accepted','arrived','in_progress','completed','cancelled'])});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid booking status.'});const booking=bookings.find(b=>b.id===req.params.id);if(!booking)return res.status(404).json({error:'Booking not found.'});booking.status=parsed.data.status;booking.updatedAt=new Date().toISOString();res.json({booking});});
app.post('/api/fare-audit',(req,res)=>{const schema=z.object({routeHash:z.string().min(1).max(200),rideId:z.string(),deviceLabel:z.string().max(80),quotedFare:z.number().nonnegative(),timestamp:z.string().datetime(),conditions:z.record(z.string(),z.union([z.string(),z.number(),z.boolean()]))});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Invalid fare audit entry.'});const item={id:randomUUID(),...parsed.data,createdAt:new Date().toISOString(),status:'recorded'};quotes.push(item);res.status(201).json({item,message:'Quote recorded. Differences require review and are not proof of discrimination.'});});
app.post('/api/support/tickets',(req,res)=>{const schema=z.object({issueType:z.string().min(1).max(80),details:z.string().min(3).max(3000),bookingId:z.string().optional()});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'Please provide issue type and details.'});const ticket={id:'SUP-'+randomUUID().slice(0,8).toUpperCase(),...parsed.data,status:'open',createdAt:new Date().toISOString(),simulated:demo};tickets.unshift(ticket);res.status(201).json({ticket});});
app.get('/api/driver/earnings',(_req,res)=>res.json({mode:'demo',currency:'INR',daily:1840,weekly:8240,monthly:27800,commissionRate:.1,expenses:320,simulated:true}));
app.get('/api/admin/analytics',(_req,res)=>res.json({mode:'demo',totalBookings:1284,grossRideValue:284000,pendingDrivers:12,openComplaints:7,simulated:true}));
app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);res.status(500).json({error:'Unexpected server error.'});});
const port=Number(process.env.PORT||4000);
app.listen(port,()=>console.log(`GoRide AI API listening on http://localhost:${port} (${demo?'DEMO':'NON-DEMO'} mode)`));
