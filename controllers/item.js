import AWS from "aws-sdk";
import { nanoid } from "nanoid";
import Item from "../models/item";
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
  console.log(req.body)
  // return;
  try {
    const alreadyExist = await Item.findOne({
      slug: slugify(req.body.name.toLowerCase()),
    });
    if (alreadyExist) return res.status(400).send("Már van ilyen nevű termék");

    const item = await new Item({
      slug: slugify(req.body.name),
      instructor: req.user._id,
      ...req.body,
    }).save();

    res.json(item);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Sikertelen művelet, kitöltötted az összes mezőt?");
  }
};

export const read = async (req, res) => {

  try {
    const item = await Item.findOne({ _id: req.params.slug })
      .populate("instructor", "_id name")
      .exec();
    res.json(item);
  } catch (err) {
    console.log(err);
  }
};


export const completedInvoice = async (req, res) => {

const { itemId } = req.body;

  try {
    const item = await Item.findOneAndUpdate(
      {_id: itemId},
      {billingCompleted:true}
    )
    .exec();
    res.json(item);
  } catch (err) {
    console.log(err);
  }
};


export const ownerGetData = async (req, res) => {

  try {
    const item = await Item.findOne({ _id: req.params.slug })
      .populate("instructor", "_id name")
      .exec();


      if (req.user._id != item.instructor._id) {
        return res.sendStatus(403); //return res.json('404')
      }else {
        res.json(item);

      }
  } catch (err) {
    console.log(err);
  }
};


export const update = async (req, res) => {
  try {
    const { slug } = req.params;
    // console.log(slug);
    const item = await Item.findOne({ _id:slug }).exec();
    if (req.user._id != item.instructor) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Item.findOneAndUpdate({ _id:slug }, req.body, {
      new: true,
    }).exec();

    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send(err.message);
  }
};

export const deleteItem = async (req, res) => {
    const { slug } = req.params;
  const item = await Item.findOne({ _id:slug }).exec();
  console.log(item.instructor)
  console.log("booya")
  console.log(req.user._id)
  console.log("after")
  if (req.user._id != item.instructor) {
    return res.status(400).send("Unauthorized");
  }

  try {

    // console.log(slug);
    const item = await Item.deleteOne({ _id:slug }).exec();



    res.json({ok:true});
  } catch (err) {
    console.log(err);
    return res.status(400).send(err.message);
  }
};





export const publishItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId).select("instructor").exec();

    if (item.instructor._id != req.user._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Item.findByIdAndUpdate(
      itemId,
      { published: true },
      { new: true }
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Publish item failed");
  }
};

export const unpublishItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await Item.findById(itemId).select("instructor").exec();

    if (item.instructor._id != req.user._id) {
      return res.status(400).send("Unauthorized");
    }

    const updated = await Item.findByIdAndUpdate(
      itemId,
      { published: false },
      { new: true }
    ).exec();
    res.json(updated);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Unpublish item failed");
  }
};

export const items = async (req, res) => {
  const all = await Item.find({ published: true })
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
  const { itemId } = req.params;
  // find items of the currently logged in user
  const user = await User.findById(req.user._id).exec();
  // check if item id is found in user items array
  let ids = [];
  let length = user.items && user.items.length;
  for (let i = 0; i < length; i++) {
    ids.push(user.items[i].toString());
  }
  res.json({
    status: ids.includes(itemId),
    item: await Item.findById(itemId).exec(),
  });
};



export const paidEnrollment = async (req, res) => {

  try {
    const item = await Item.findById(req.params.itemId)
      .populate("instructor")
      .exec();

    // if (!item.paid) return;
    // application fee 30%
    const fee = (item.price * 12.7) / 100;
    // create stripe session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      receipt_email: req.user.email,

      // purchase details
      line_items: [
        {
          name: item.name,
          amount: Math.round(item.price.toFixed(2) * 100),
          currency: "huf",
          quantity: 1,
        },
      ],
      // charge buyer and transfer remaining balance to seller (after fee)
      payment_intent_data: {
        application_fee_amount: Math.round(fee.toFixed(2) * 100),
        transfer_data: {
          destination: item.instructor.stripe_account_id,
        },
      },
      // redirect url after successful payment
      success_url: `${process.env.STRIPE_SUCCESS_URL}/${item._id}`,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });

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
    // find item
    const item = await Item.findById(req.params.itemId).exec();
    // get user from db to get stripe session id
    const user = await User.findById(req.user._id).exec();
    // if no stripe session return
    if (!user.stripeSession.id) return res.sendStatus(400);
    // retrieve stripe session
    const session = await stripe.checkout.sessions.retrieve(
      user.stripeSession.id
    );

//add time of purchase
    const itemToUpdateEmail = await Item.findByIdAndUpdate(req.params.itemId, {
      $set: {buyerEmail: session.customer_details.email, purchaseDate:Date.now()}
    }).exec();





    //update item field sold to true
    // if session payment status is paid, push item to user's item
    if (session.payment_status === "paid") {
      await User.findByIdAndUpdate(user._id, {
        $push: {purchases: {time:Date.now(), itemId: item._id, item:item } },
        $addToSet: { items: item._id },//add purchase date and item id
        $set: { stripeSession: {} },
      }).exec();
    }

    const itemToUpdate = await Item.findByIdAndUpdate(req.params.itemId,{
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
                    <p>Az eladó hamarosan kapcsolatba fog lépni veled. Amennyiben ez 5 napon belül nem történik meg, írj nekünk vagy az eladónak. A megvétel napjától 20 napig tudunk neked segíteni, ha valami nem megfelelő a vásárolt termékkel.</p>

                    <h2>Eladó adatai:</h2>
                    <h4>Email címe :   ${ item.email}</h4>
                    <h4> Telefonszáma : ${ item.phone}</h4>
                    <a href=www.flipit.store>FlipIt</a>
                    <p></p>
                  </html>
                `,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "|FlipIt| Vásárlás megerősítése",
          },
        },
      };

      const params2 = {
        Source: process.env.EMAIL_FROM,
        Destination: {
          ToAddresses: [item.email],
        },
        Message: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: `
                  <html>
                    <h1>Valaki megvette az egyik tárgyadat</h1>
                    <p>A vevő már kifizette a terméket, a pénzt 25 nap múlva utaljuk neked, ha sikeresen átvette tőled a vevő a tárgyat.</p>
                    <p>Befolyt összeg megtekíntése <a href=www.flipit.store/seller/revenue>www.flipit.store/seller/revenue</a> </p>

                    <p>Tárgy amit megvettek tőled: ${item.name}</p>

                    <p>Írj vissza a vevőnek minél előbb, hogy a tárgyat hol és mikor tudja átvenni</p>
                    <p>Vevő email címe: ${session.customer_details.email}</p>
                    <p>Az eladásról készült számlát 8 napon belül küldjük erre az email címre</p>
                    <p>Javasoljuk minden eladónak, hogy az eladott termék átadásakor írasson alá egy átadási-átvételi papírt a vevővel. Átadás-átvételi nyilatkozat letölthető innen: https://www.flipit.store/downloads</p>

                    <h6>FlipIt</h6>
                  </html>
                `,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "|FlipIt| Valaki megvette az egyik tárgyadat",
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



    res.json({ success: true, item });
  } catch (err) {
    console.log("STRIPE SUCCESS ERR", err);
    res.json({ success: false });
  }
};

export const userItems = async (req, res) => {
  const user = await User.findById(req.user._id).exec();
  const items = await Item.find({ _id: { $in: user.items } })
    .populate("instructor", "_id name")
    .exec();
  res.json(items);
};





export const search = async (req, res) => {
  const {
    toSend
  } = req.body;

let {subCategory, item, category,price,quality,city}=toSend


const handleSearch=async(queryObject)=>{
 try {
   let items = await Item.find(queryObject)
     .populate("instructor", "_id name")
     .exec();
   return res.json(items,);
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
    if(price.length>0 && price!='max'){
      queryObject={...queryObject, price:{ $lte: Number(price.replace(/[^0-9]/g,''))}}
    }
    if(price.length>0 && price=='max'){
        queryObject={...queryObject, price:{ $lte: 100000000}}
    }
  }
   handleSearch(queryObject)
   console.log(queryObject)

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
  try{
    const soldItems = await Item.find({instructor: req.user._id,sold:true })
      .exec();
    res.json(soldItems);
  } catch (err){
    console.log(err)
  }
};

export const removeFromWishlist = async (req, res) => {
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

      let itemWithQuestion = await Item.findById(req.params.itemId)

      let commentAdded = await Item.findByIdAndUpdate(
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
                      <h4>FlipIt</h4>
                    <h2>Valaki kérdezett valamit a(z) ${itemWithQuestion.name} termékedről</h2>
                    <h4>Kattins az alábbi linkre és válaszolj a potenciális vevő kérdésre</h4>
                        <p>Ha nem vagy bejelentkezve akkor előbb jelentkezz be</p>
                      <h4>  <a href=www.flipit.store/item/${itemWithQuestion._id}>Válaszolj itt </a> </h4>

                  <h6>FlipIt</h6>
                  </html>
                `,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "|FlipIt| Valaki kérdezett valamit az egyik termékedről",
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



      res.json(commentAdded);
    }catch (err){
      console.log(err)
    }

};





export const getComments = async (req, res) => {

  try{
    const item = await Item.findOne({ _id: req.params.itemId })
    .select("comments -_id")
    .exec();
    res.json({item})
  } catch(err){
    console.log(error)
  }
};

export const loadInvoices = async (req, res) => {

  try{
    const itemsToBeProccessed = await Item.find({

      $and: [
      {  sold: true },
      {billingCompleted: false}
        ]
     })
    .exec();
    res.json(itemsToBeProccessed)
  } catch(err){
    console.log(error)
  }
};

export const loadAllInvoices = async (req, res) => {

  try{
    const itemsToBeProccessed = await Item.find({

      $and: [
      {  sold: true },
      {billingCompleted: true}
        ]
     })
    .exec();
    res.json(itemsToBeProccessed)
  } catch(err){
    console.log(error)
  }
};



export const commentAnswers = async (req, res) => {
  //send email to the person who asked the question
  try{
    const item=await Item.findOneAndUpdate( { comments: { $elemMatch: { _id: req.body.toSend.commentId } } }, {$set:{'comments.$.answer':req.body.toSend.text}} )


     const itemToLookFor = await Item.findOne( { comments: { $elemMatch: { _id: req.body.toSend.commentId } } } ).select('comments').exec();
     const itemToLookForForEmail = await Item.findOne( { comments: { $elemMatch: { _id: req.body.toSend.commentId } } } ).exec();



    var result = itemToLookFor.comments.map(item => ({ id:item._id, postedBy:item.postedBy }));
    let needId;

//look at all the comments and see which one has an id that match the commentId from our frontend
    for(let i=0; i<result.length;i++){
      if(result[i].id==req.body.toSend.commentId)
      needId=result[i]
    }

    const userWhoAskedQuestion = await User.findOne({_id:needId.postedBy}).select("email -_id")

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
                  <h3>Válaszoltak a kérdésedre</h3>
                  <p>Az eladó válaszolt a kérdésedre amit erről a termékrők kérdztél: ${ itemToLookForForEmail.name}  </p>
                  <p>Nézd meg a választ itt: <a href=www.flipit.store/item/${itemToLookForForEmail._id}>www.flipit.store/item/${itemToLookForForEmail._id}</a></p>

                  <h6>FlipIt</h6>
                </html>
              `,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: "|FlipIt| Válasz a kérdésre",
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
