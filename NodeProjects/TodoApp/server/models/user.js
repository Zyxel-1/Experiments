const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken')
const _ = require('lodash')
const bcrypt = require('bcryptjs')

var UserSchema  = new mongoose.Schema({
        email:{
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            unique: true,
            validate:{
                validator: validator.isEmail,
                message: '{VALUE} is not a valid email'
            }
        },
        password:{
            type: String,
            require: true,
            minlength: 6
        },
        tokens:[{
         access: {
            type: String,
            required: true
         },
         token:{
             type: String,
             required: true
         }
        }]
    }
);
UserSchema.methods.toJSON = function(){
    var user = this;
    var userObject = user.toObject();

    return _.pick(userObject, ['_id','email'])

}

UserSchema.methods.generateAuthToken = function () {
    var user = this;
    var access = 'auth';
    var token = jwt.sign({_id: user._id.toHexString(),access},'asdf').toString();
    
    user.tokens = user.tokens.concat([{access, token}]);

    return user.save().then(() => {
        return token;
    });
};

UserSchema.methods.removeToken = function (token) {
    var user = this;

    return user.update({
        $pull: {
            tokens: {token}
        }
    })
};

UserSchema.statics.findByToken = function (token) {
    var User = this;
    var decoded;

    try {
        decoded = jwt.verify(token, 'asdf');
    } catch (e) {
        return Promise.reject();
    }

    return User.findOne({
        _id: decoded._id,
        'tokens.token': token,
        'tokens.access': 'auth'
    })
}
// Finds credential in Database
UserSchema.statics.findByCredentials = function (email, password) {
    var User = this;
    // Returns user that is found
    return User.findOne({email}).then((user)=>{
        // reject promise if there isn't any matches
        if(!user){
            return Promise.reject();
        }
        // If found compare password from function to password in user found.
        return new Promise((resolve,reject)=>{
            // Use bcrypt.compare to compare password and user.password
            bcrypt.compare(password,user.password,(err,res)=>{
                if(res){
                    resolve(user);
                } else{
                    reject();
                }
            });
        });
    });
};

UserSchema.pre('save', function (next) {
    var user = this;

    if (user.isModified('password')) {
        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) => {
                user.password = hash;
                next();
            });
        });
    } else {
        next();
    }
});

var User = mongoose.model('User',UserSchema);

module.exports = {User};