CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS app_users (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 phone VARCHAR(20) UNIQUE NOT NULL,
 display_name VARCHAR(120),
 role VARCHAR(20) NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger','driver','admin')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS saved_places (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 label VARCHAR(40) NOT NULL,
 address TEXT NOT NULL,
 latitude DOUBLE PRECISION,
 longitude DOUBLE PRECISION,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS driver_profiles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID UNIQUE NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 licence_document_key TEXT,
 vehicle_document_key TEXT,
 insurance_document_key TEXT,
 vehicle_type VARCHAR(30),
 vehicle_registration VARCHAR(30),
 verification_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected')),
 is_online BOOLEAN NOT NULL DEFAULT false,
 rating NUMERIC(2,1),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fare_rules (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 ride_type VARCHAR(30) UNIQUE NOT NULL,
 base_fare NUMERIC(10,2) NOT NULL CHECK (base_fare >= 0),
 per_km NUMERIC(10,2) NOT NULL CHECK (per_km >= 0),
 per_minute NUMERIC(10,2) NOT NULL CHECK (per_minute >= 0),
 service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
 tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05,
 active BOOLEAN NOT NULL DEFAULT true,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ride_bookings (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 passenger_id UUID REFERENCES app_users(id),
 driver_id UUID REFERENCES driver_profiles(id),
 pickup_address TEXT NOT NULL,
 destination_address TEXT NOT NULL,
 pickup_lat DOUBLE PRECISION,
 pickup_lng DOUBLE PRECISION,
 destination_lat DOUBLE PRECISION,
 destination_lng DOUBLE PRECISION,
 ride_type VARCHAR(30) NOT NULL,
 estimated_distance_km NUMERIC(8,2),
 estimated_minutes INTEGER,
 fare_breakdown JSONB NOT NULL,
 estimated_total NUMERIC(10,2) NOT NULL CHECK (estimated_total >= 0),
 final_total NUMERIC(10,2),
 status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','accepted','arrived','in_progress','completed','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ride_bookings_passenger_created_idx ON ride_bookings(passenger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ride_bookings_status_idx ON ride_bookings(status);
CREATE TABLE IF NOT EXISTS payment_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id UUID NOT NULL REFERENCES ride_bookings(id),
 provider VARCHAR(40) NOT NULL,
 provider_reference VARCHAR(160),
 amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
 currency CHAR(3) NOT NULL DEFAULT 'INR',
 status VARCHAR(20) NOT NULL CHECK (status IN ('created','pending','paid','failed','refunded')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fare_audit_entries (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES app_users(id),
 route_fingerprint VARCHAR(200) NOT NULL,
 ride_type VARCHAR(30) NOT NULL,
 device_label VARCHAR(80),
 quoted_fare NUMERIC(10,2) NOT NULL CHECK (quoted_fare >= 0),
 quoted_at TIMESTAMPTZ NOT NULL,
 conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
 review_status VARCHAR(20) NOT NULL DEFAULT 'recorded' CHECK (review_status IN ('recorded','review_needed','reviewed','closed')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS support_tickets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID REFERENCES app_users(id),
 booking_id UUID REFERENCES ride_bookings(id),
 issue_type VARCHAR(80) NOT NULL,
 details TEXT NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','closed')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_audit_logs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 admin_user_id UUID REFERENCES app_users(id),
 action VARCHAR(100) NOT NULL,
 target_type VARCHAR(50),
 target_id UUID,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO fare_rules(ride_type,base_fare,per_km,per_minute,service_fee,tax_rate) VALUES
 ('mini',35,12,1.4,8,0.05),('sedan',55,15,1.8,8,0.05),('xl',85,19,2.2,8,0.05),('bike',18,6,.7,5,0.05),('electric',45,13,1.5,8,0.05)
ON CONFLICT(ride_type) DO NOTHING;
