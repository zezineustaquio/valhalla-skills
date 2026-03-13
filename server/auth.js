import 'dotenv/config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from './db.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'zezineustaquio@gmail.com';

passport.serializeUser((user, done) => {
  done(null, user.email);
});

passport.deserializeUser((email, done) => {
  const athlete = db.prepare('SELECT * FROM athletes WHERE email = ?').get(email);
  const isAdmin = email === ADMIN_EMAIL || (athlete?.is_admin === 1);
  done(null, { email, isAdmin, athleteId: athlete?.id });
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const athlete = db.prepare('SELECT * FROM athletes WHERE email = ?').get(email);
  const isAdmin = email === ADMIN_EMAIL || (athlete?.is_admin === 1);
  done(null, { email, isAdmin, athleteId: athlete?.id });
}));

export default passport;
