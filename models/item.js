import mongoose from "mongoose";
const moment = require('moment');

const { ObjectId } = mongoose.Schema;


const itemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      minlength: 3,
      maxlength: 320,
      required: true,
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: {},
      minlength: 200,
      required: true,
    },
    price: {
      type: Number,
      required:true
    },
    instructor: {
      type: ObjectId,
      ref: "User",
      required: true,
    },

    category: {
      type:String,
      required:true
    },
    subCategory:{
      type:String,
      required:true
    },
    quality:{
      type:String,
      required:true
    },
    item:{
      type:String,
      required:true
    },
    city:{
      type:String,
      required:true
    },
    street:{
      type:String,
      required:true
    },
    email:{
      type:String,
      required:true
    },
    phone:{
      type:String,
      required:true
    },

    sold:{
      type: Boolean,
    default: false,
    },

    buyerEmail:"String",

    billingAddress:{
      type:String,
      required:true
    },

    billingNameUser:{
      type:String,
      required:true
    },

    billingCompleted:{
      type:Boolean,
    default:false,
    },

    images: {
        type: Array,
        required:true
      },
      purchaseDate:{type:Date},

      comments: [
      {
        text:{type:String,required:true},
        answer:{type:String},
        name:{type:String,required:true},
        date:{type:Date,default:moment()},
        postedBy: { type: ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Item", itemSchema);
