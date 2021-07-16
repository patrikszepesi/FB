import AWS from "aws-sdk";
import { nanoid } from "nanoid";
import Course from "../models/course";
import Completed from "../models/completed";
import slugify from "slugify";
import { readFileSync } from "fs";
import User from "../models/user";
const stripe = require("stripe")(process.env.STRIPE_SECRET);



const awsConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
  apiVersion: process.env.AWS_API_VERSION,
};

const S3 = new AWS.S3(awsConfig);
const SES = new AWS.SES(awsConfig);

export const uploadImage = async (req, res) => {
  // console.log(req.body);
  try {
    const { image } = req.body;
    if (!image) return res.status(400).send("No image");

    // prepare the image
    const base64Data = new Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );

    const type = image.split(";")[0].split("/")[1];

    // image params
    const params = {
      Bucket: "vidz-online",
      Key: `${nanoid()}.${type}`,
      Body: base64Data,
      ACL: "public-read",
      ContentEncoding: "base64",
      ContentType: `image/${type}`,
    };

    // upload to s3
    S3.upload(params, (err, data) => {
      if (err) {
        console.log(err);
        return res.sendStatus(400);
      }
      console.log(data);
      res.send(data);
    });
  } catch (err) {
    console.log(err);
  }
};

export const getUser = async(req,res)=>{
  try{
    const currentUser = await User.findOne({
      _id: req.params.userId,
    }).select('wishlist -_id ').exec()
    console.log(currentUser)
    res.json(currentUser);

  }catch (err){
    console.log(err)
  }
}

export const removeImage = async (req, res) => {
  try {
    const { image } = req.body;

    // image params
    const params = {
      Bucket: image.Bucket,
      Key: image.Key,
    };

    // send remove request to s3
    S3.deleteObject(params, (err, data) => {
      if (err) {
        console.log(err);
        res.sendStatus(400);
      }
      res.send({ ok: true });
    });
  } catch (err) {
    console.log(err);
  }
};

export const create = async (req, res) => {
  // console.log("CREATE COURSE", req.body);
  // return;
  try {
    const alreadyExist = await Course.findOne({
      slug: slugify(req.body.name.toLowerCase()),
    });
    if (alreadyExist) return res.status(400).send("Title is taken");

    const course = await new Course({
      slug: slugify(req.body.name),
      instructor: req.user._id,
      ...req.body,
    }).save();

    res.json(course);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Course create failed. Try again.");
  }
};

export const read = async (req, res) => {
  console.log("READ WAS HIT, THIS IS WHAT YOU WANT!")
  console.log(req.params)
  try {
    const course = await Course.findOne({ _id: req.params.slug })
      .populate("instructor", "_id name")
      .exec();
    res.json(course);
  } catch (err) {
    console.log(err);
  }
};

export const ownerGetData = async (req, res) => {
  console.log("hit")

  try {
    const course = await Course.findOne({ _id: req.params.slug })
      .populate("instructor", "_id name")
      .exec();


      if (req.user._id != course.instructor._id) {
        return res.sendStatus(403); //return res.json('404')
      }else {
        res.json(course);

      }
  } catch (err) {
    console.log(err);
  }
};


export const update = async (req, res) => {
  console.log(req.params)
  try {
    const { slug } = req.params;
    // console.log(slug);
    const course = await Course.findOne({ _id:slug }).exec();
     console.log("COURSE FOUND => ", course);
    if (req.user._id != course.instructor) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findOneAndUpdate({ _id:slug }, req.body, {
      new: true,
    }).exec();
    console.log(updated)

    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send(err.message);
  }
};




export const publishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();

    if (course.instructor._id != req.user._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      { published: true },
      { new: true }
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Publish course failed");
  }
};

export const unpublishCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).select("instructor").exec();

    if (course.instructor._id != req.user._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Course.findByIdAndUpdate(
      courseId,
      { published: false },
      { new: true }
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Unpublish course failed");
  }
};

export const courses = async (req, res) => {
  const all = await Course.find({ published: true })
    .populate("instructor", "_id name")
    .exec();
  res.json(all);
};

export const invoice = async (req, res) => {

  try{
     var userPurchases= await User.findOne({_id:req.params.userId}).select('purchases -_id')

   }catch(err){
     console.log(err)
   }

  res.json(userPurchases)
};

export const checkEnrollment = async (req, res) => {
  const { courseId } = req.params;
  // find courses of the currently logged in user
  const user = await User.findById(req.user._id).exec();
  // check if course id is found in user courses array
  let ids = [];
  let length = user.courses && user.courses.length;
  for (let i = 0; i < length; i++) {
    ids.push(user.courses[i].toString());
  }
  res.json({
    status: ids.includes(courseId),
    course: await Course.findById(courseId).exec(),
  });
};



export const paidEnrollment = async (req, res) => {

  try {
    const course = await Course.findById(req.params.itemId)
      .populate("instructor")
      .exec();

    // if (!course.paid) return;
    // application fee 30%
    const fee = (course.price * 30) / 100;
    // create stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      receipt_email: req.user.email,

      // purchase details
      line_items: [
        {
          name: course.name,
          amount: Math.round(course.price.toFixed(2) * 100),
          currency: "huf",
          quantity: 1,
        },
      ],
      // charge buyer and transfer remaining balance to seller (after fee)
      payment_intent_data: {
        application_fee_amount: Math.round(fee.toFixed(2) * 100),
        transfer_data: {
          destination: course.instructor.stripe_account_id,
        },
      },
      // redirect url after successful payment
      success_url: `${process.env.STRIPE_SUCCESS_URL}/${course._id}`,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });
    console.log("SESSION ID => ", session);

    await User.findByIdAndUpdate(req.user._id, {
      stripeSession: session,
    }).exec();
    res.send(session.id);
  } catch (err) {
    console.log("PAID ENROLLMENT ERR", err);
    return res.status(400).send("Enrollment create failed");
  }
};
//
export const stripeSuccess = async (req, res) => {
  try {
    // find course
    const course = await Course.findById(req.params.courseId).exec();
    // get user from db to get stripe session id
    const user = await User.findById(req.user._id).exec();
    // if no stripe session return
    if (!user.stripeSession.id) return res.sendStatus(400);
    // retrieve stripe session
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );

    const courseToUpdateEmail = await Course.findByIdAndUpdate(req.params.courseId, {
      $set: {buyerEmail: session.customer_details.email}
    }).exec();




    console.log("STRIPE SUCCESS", session.customer_details.email);
    console.log(session.customer_details)
    //update item field sold to true
    // if session payment status is paid, push course to user's course
    if (session.payment_status === "paid") {
      await User.findByIdAndUpdate(user._id, {
        $push: {purchases: {time:Date.now(), courseId: course._id, course:course } },
        $addToSet: { courses: course._id },//add purchase date and course id
        $set: { stripeSession: {} },
      }).exec();
    }

    const item = await Course.findByIdAndUpdate(req.params.courseId,{
      $set:{sold:true}
    }).exec();

    try {

      const params = {
        Source: process.env.EMAIL_FROM,
        Destination: {
          ToAddresses: [session.customer_details.email],
        },
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: `
                  <html>
                    <h1>Vásárlás megerősítése</h1>
                    <p>A vásárló hamarosan kapcsolatba fog lépni veled. Amennyiben ez 5 napon belül nem történik meg, írj nekünk vagy az eladónak</p>

                    <p>Eladó adatai:</p>
                    <h2 style="color:blue;">Emailcíme :   ${ course.email}</h2>
                    <h2> Telefonszáma : ${ course.phone}</h2>
                    <i>FurFlip.com</i>
                  </html>
                `,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Vásárlás megerősítése",
          },
        },
      };

      const params2 = {
        Source: process.env.EMAIL_FROM,
        Destination: {
          ToAddresses: [course.email],
        },
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: `
                  <html>
                    <h1>Valaki megvette az egyik tárgyadat</h1>
                    <p>A vevő már kifizette a terméket, a pénzt xy napon utaljuk neked, ha sikeresen átvette tőled a vevő a tárgyat</p>
                    <p>Befolyt össze megtekíntése</p>
                    <i>www.furflip.com/seller/revenue</i>


                    <p>Tárgy amit megvettek tőled:</p>
                    <h2 style="color:blue;">${course.name}</h2>

                    <p>Írj vissza a vevőnek minél előbb, hogy a tárgyat hol és mikor tudja átvenni</p>
                    <p>Vevő emailcíme:</p>
                    <h2 style="color:blue;">${session.customer_details.email}</h2>

                    <i>FurFlip.com</i>
                  </html>
                `,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Valaki megvette az egyik tárgyadat",
          },
        },
      };

      const emailSent = SES.sendEmail(params).promise();
      emailSent
        .then((data) => {
          console.log("success");
          //res.json({ ok: true });
        })
        .catch((err) => {
          console.log(err);
        });

        const emailSentToSeller = SES.sendEmail(params2).promise();
        emailSentToSeller
          .then((data) => {
            console.log("success");
            //res.json({ ok: true });
          })
          .catch((err) => {
            console.log(err);
          });

    } catch (err) {
      console.log(err);
    }



    res.json({ success: true, course });
  } catch (err) {
    console.log("STRIPE SUCCESS ERR", err);
    res.json({ success: false });
  }
};

export const userCourses = async (req, res) => {
  const user = await User.findById(req.user._id).exec();
  const courses = await Course.find({ _id: { $in: user.courses } })
    .populate("instructor", "_id name")
    .exec();
  res.json(courses);
};



export const listCompleted = async (req, res) => {
  try {
    const list = await Completed.findOne({
      user: req.user._id,
      course: req.body.courseId,
    }).exec();
    list && res.json(list.lessons);
  } catch (err) {
    console.log(err);
  }
};



export const search = async (req, res) => {
  console.log("hit")
  const {
    toSend
  } = req.body;

let {subCategory, item, category,price,quality,city}=toSend

console.log(req.body.toSend)
const handleSearch=async(queryObject)=>{
  console.log("hit")
 try {
   let courses = await Course.find(queryObject)
     .populate("instructor", "_id name")
     .exec();
   return res.json(courses,);
    } catch (err) {
   console.log(err);
    }
 }

   let queryObject={sold:false};
  if(req.body.toSend){
    if( subCategory!= undefined && subCategory.length>0){
    queryObject = {...queryObject, subCategory}
    }
    if( category!=undefined && category.length>0){
      queryObject={...queryObject,category}
    }
    if(item.length>0){
      queryObject={...queryObject,item}
    }
    if(quality.length>0){
      queryObject={...queryObject,quality}
    }
    if(price[1]>1){
      queryObject={...queryObject, price:{$gte: price[0],
       $lte: price[1]}}
    }

    console.log(queryObject)
  }
   handleSearch(queryObject)

};

export const addToWishlist = async (req, res) => {
  const { itemId } = req.params;


  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $addToSet: { wishlist: itemId } }//unique
  ).exec();

  res.json({ok:true});
};

export const readWishlist = async (req, res) => {
  try{
    const list = await User.findOne({ _id: req.user._id })
      .select("wishlist")
      .populate("wishlist")
      .exec();

    res.json(list);
  } catch (err){
    console.log(err)
  }
};

export const sold = async (req, res) => {
  console.log(req.user)
  try{
    const soldItems = await Course.find({instructor: req.user._id,sold:true })
      .exec();
      console.log(soldItems)
    res.json(soldItems);
  } catch (err){
    console.log(err)
  }
};

export const removeFromWishlist = async (req, res) => {
  console.log(req.params)
  console.log(req.user)
  const { itemId } = req.params;
  const user = await User.findOneAndUpdate(
    { _id: req.user._id },
    { $pull: { wishlist: itemId } }
  ).exec();

  res.json({ ok: true });
};


export const comments = async (req, res) => {
  const { text,name } = req.body.toSend;
//send email to the owner of the item
    try{
      const user = await User.findOne({ email: req.body.user.email }).exec();//i dont think i need this, double check

      let itemWithQuestion = await Course.findById(req.params.itemId)

      let commentAdded = await Course.findByIdAndUpdate(
        req.params.itemId,
        {
          $push: {comments: {name,text, postedBy: req.body.user._id } },
        },
        { new: true }
      ).exec();

      const params = {
        Source: process.env.EMAIL_FROM,
        Destination: {
          ToAddresses: [itemWithQuestion.email],
        },
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: `
                  <html>
                    <h1>Valaki kérdezett valamit az egyik termékedről</h1>
                    <p>Jelentkezz be, kattins az alábbi linkre és válaszolj a potenciális vevő kérdésre</p>
                    <i>www.sell.com/item/${itemWithQuestion._id}</i>

                    <h2 style="color:red;">${itemWithQuestion.name}</h2>
                    <h2 style="color:red;">${itemWithQuestion.item}</h2>
                    <i>FurFlip.com</i>
                  </html>
                `,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Valaki kérdezett valamit az egyik termékedről",
          },
        },
      };

      const emailSent = SES.sendEmail(params).promise();
      emailSent
        .then((data) => {
          console.log("success");
          //res.json({ ok: true });
        })
        .catch((err) => {
          console.log(err);
        });

      console.log("ratingAdded", commentAdded);


      res.json(commentAdded);
    }catch (err){
      console.log(err)
    }

};





export const getComments = async (req, res) => {

  try{
    const item = await Course.findOne({ _id: req.params.itemId })
    .select("comments -_id")
    .exec();
    res.json({item})
    console.log(item)
  } catch(err){
    console.log(error)
  }
};

export const commentAnswers = async (req, res) => {
  //send email to the person who asked the question
  try{
    const item=await Course.findOneAndUpdate( { comments: { $elemMatch: { _id: req.body.toSend.commentId } } }, {$set:{'comments.$.answer':req.body.toSend.text}} )


     const itemToLookFor = await Course.findOne( { comments: { $elemMatch: { _id: req.body.toSend.commentId } } } ).select('comments').exec();
     const itemToLookForForEmail = await Course.findOne( { comments: { $elemMatch: { _id: req.body.toSend.commentId } } } ).exec();



    var result = itemToLookFor.comments.map(item => ({ id:item._id, postedBy:item.postedBy }));
    let needId;

//look at all the comments and see which one has an id that match the commentId from our frontend
    for(let i=0; i<result.length;i++){
      if(result[i].id==req.body.toSend.commentId)
      needId=result[i]
    }

    const userWhoAskedQuestion = await User.findOne({_id:needId.postedBy}).select("email -_id")
    console.log(userWhoAskedQuestion)

    const params2 = {
      Source: process.env.EMAIL_FROM,
      Destination: {
        ToAddresses: [userWhoAskedQuestion.email],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `
                <html>
                  <h1>Válaszoltak a kérdésedre</h1>
                  <p>Az eladó válaszolt a kérdésedre</p>

                  <p>Termék neve?</p>
                  <h2 style="color:blue;">${itemToLookForForEmail.name}</h2>

                  <i>FurFlip.com</i>
                </html>
              `,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "Válasz a kérdésre",
        },
      },
    };

    const emailSent = SES.sendEmail(params2).promise();
    emailSent
      .then((data) => {
        console.log("success");
        //res.json({ ok: true });
      })
      .catch((err) => {
        console.log(err);
      });


    res.json({ok:true})
  } catch(err){
    console.log(err)
  }

};
