const passport = require('passport'); 
const GoogleStrategy = require('passport-google-oauth2').Strategy; 
  
passport.serializeUser((user , done) => { 
    done(null , user); 
}) 
passport.deserializeUser(function(user, done) { 
    done(null, user); 
}); 
  
passport.use(new GoogleStrategy({ 
    clientID:"47797834580-82ju7fvonlmjj9fq478ah21n7mn8920f.apps.googleusercontent.com",
    clientSecret:"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", 
    callbackURL:"http://localhost:4000/auth/callback", 
    passReqToCallback:true
  }, 
  function(request, accessToken, refreshToken, profile, done) { 
    return done(null, profile); 
  } 
));