
const { response } = require('express');
var express = require('express');
const session = require('express-session');
const jwt= require('jsonwebtoken')
var router = express.Router();
var productHelper=require('../helpers/product-helpers')
var userHelper=require('../helpers/user-helpers')
const API_KEY='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'
const sgMail = require('@sendgrid/mail')
const JWT_SECRET = 'some super secret ....'
let COUPON_CODE='Yasi123'
const verifyLogin=(req,res,next)=>{
  if(req.session.userloggedIn){
    next()
  }else{
    res.redirect('/login')
  }
}
/* GET home page.*/
router.get('/', async function(req, res, next) {
  let user=req.session.user
  
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
  let lap= await productHelper.getProductLaptop()
  let phone= await productHelper.getProductSmartphone()
  let accessories= await productHelper.getProductAccessories()
  
  
  productHelper.getallproducts().then((products)=>{
    
    res.render('user/index',{user,products,cartCount,index:true,lap,phone,accessories});
  })
 
});
router.get('/signup',(req,res)=>{
  if(req.session.userloggedIn){
    res.redirect("/")
  }else{
  res.render("user/signup")
  }
})
router.get('/login',(req,res)=>{
  
  if(req.session.userloggedIn){
   
    res.redirect("/")
  }else{
    
  res.render("user/login",{"loginErr":req.session.userloginErr})
  req.session.userloginErr=false
  
  }
})
router.post('/signup',(req,res)=>{
  
  userHelper.doSignup(req.body).then((response)=>{
     
    req.session.user=response.user
    req.session.userloggedIn=true
       let user=req.session.user
      let username=response.user.Name
      let useremail=response.user.Email
    res.render('user/profile-form',{username,user,useremail})
  })
})
router.get('/forgotPassword',(req,res)=>{
  res.render('user/forgot-password')
})
router.post('/forgotPassword',(req,res)=>{
  
  userHelper.getUserWithEmail(req.body).then((response)=>{
    console.log(response);
    res.render('user/confirm-user',{response})
  })
})

router.get('/confirm-user',async (req,res)=>{
  console.log(req.query.id)
  let user= await userHelper.getUserDetails(req.query.id)
  console.log(user)
  const secret =JWT_SECRET + user.Password
  const payload={
    email: user.Email,
    id:user._id
  }
  const token = jwt.sign(payload, secret, {expiresIn:'15m'})
  const link=`http://localhost:3001/reset-password/${user._id}/${token}`
  sgMail.setApiKey(API_KEY)
const message={
  to: user.Email,
  from: {
    name:'Mohammed Yaseen',
    email:'yyaseen080@gmail.com'
  },
  subject: 'hello from yaseen',
  text:'hello from yasi',
  html:link
}
sgMail.send(message).then((response)=>console.log('email send'))
.catch((error)=>console.log(error.message))
  console.log(link)
  res.send('Password reset link sent to your gmail')
})


router.get('/reset-password/:id/:token',async(req,res)=>{
const {id, token}=req.params
let user= await userHelper.getUserDetails(id)
if(user){
 const secret= JWT_SECRET+user.Password
 try{
   const payload=jwt.verify(token, secret)
   console.log('ithaan tta id')
   console.log(id)
   res.render('user/reset-password',{email:user.Email,id:id})
 }
 catch(error){
   console.log(error.message)
 }
}
else{
  res.send('Invalid Id')
}
})


router.post('/reset-password',(req,res)=>{
console.log(req.body)
console.log(req.query)
userHelper.changePassword(req.query.id,req.body.Password1).then(()=>{
  res.redirect('/login')
})
})



router.post('/updateProfile',(req,res)=>{
 
  console.log(req.body)
  console.log(req.query.id)
  userHelper.profileUpdate(req.body,req.query.id).then(()=>{
    let image=req.files.Image
  image.mv('./public/user-image/'+req.query.id+'.jpg',(err,done)=>{
    if(!err){
     
     res.redirect('/')
    }else{
      console.log(err)
    }
  })
  })
})


router.post('/login',(req,res)=>{
  userHelper.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user=response.user
      req.session.userloggedIn=true
      res.redirect('/')
    }
    else{
      req.session.userloginErr="invalid username or password"
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userloggedIn=false
  res.redirect('/')
})

router.get('/addtocart/:id',verifyLogin,(req,res)=>{ 
  userHelper.addToCart(req.params.id,req.session.user._id).then(()=>{
  res.json({status:true})
  })
})

router.get('/cart',verifyLogin,async (req,res)=>{
  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
let products=await userHelper.getCartProducts(req.session.user._id)
let total=0
let allTotal=0
if(products.length>0){
   total=await userHelper.getTotalAmount(req.session.user._id)
   
   if(total>1000){
     orgTotal=true
     allTotal=total
   }
   else{
     orgTotal=false
    allTotal=total+40;
   }
   
}

res.render('user/cart',{products,user,'userId':req.session.user._id,allTotal,cartCount,total,orgTotal})
  
})

router.post('/change-product-quantity',(req,res,next)=>{
  
  userHelper.changeProductQuantity(req.body).then(async(response)=>{
    console.log(response)
    
    response.total=await userHelper.getTotalAmount(req.body.user)
    if(response.total>1000){
      response.orgTotal=true
     response.allTotal=response.total
    }
    else{
     response.allTotal=response.total+40;
    }
    
   
    console.log(response.allTotal)
    res.json(response)
  })
})



router.post('/remove-cart-products',(req,res,next)=>{
  
  console.log(req.body);
  userHelper.removeCartProducts(req.body).then((response)=>{
    res.json(response)
  })
})
router.get('/place-order',verifyLogin,async(req,res)=>{
  let userDetails=await userHelper.getUserDetails(req.session.user._id)
  let total=await userHelper.getTotalAmount(req.session.user._id)
  res.render('user/order-page',{total,user: req.session.user,userDetails})
})

router.post('/place-order',verifyLogin,async(req,res)=>{
  let products=await userHelper.getCartProductList(req.session.user._id)
    let price=await userHelper.getTotalAmount(req.session.user._id)
  userHelper.PlaceOrder(req.body,products,price).then((orderId)=>{
    if(req.body['payment-method']=='COD'){
      res.json({cod_success:true})
    }else{
      userHelper.generateRazorPay(orderId,price).then((response)=>{
       res.json(response)
      })
    }

    
  })

})

router.get('/ordered-response',async (req,res)=>{
  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
  res.render('user/ordered-response',{user,cartCount})
})

router.get('/orders', async (req,res)=>{

  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
  let products=await userHelper.getOrderList(req.session.user._id)
  
  res.render('user/order-list',{products,user,cartCount})
})

router.get('/view-order-products',async(req,res)=>{
  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
  let products=await userHelper.getOrderProducts(req.query.id)
  res.render('user/view-order-products',{user,products,cartCount})
})

router.post('/verify-payment',(req,res)=>{
  console.log(req.body)
  userHelper.verifyPayment(req.body).then(()=>{
   userHelper.changePaymentStatus(req.body['order[receipt]']).then(()=>{
     res.json({status:true})
   })
  }).catch((err)=>{
    res.json({status:false})
  })
})


router.get('/user-profile',async (req,res)=>{
 
  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
    console.log(cartCount)
  }
 let userDetails=await userHelper.getUserDetails(req.session.user._id)


  res.render('user/profile',{userDetails,cartCount,user})
})

router.get('/productDetailsView',async (req,res)=>{
  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
console.log(req.query.id);
  
 let product= await productHelper.getProductDetails(req.query.id)
 
  res.render('user/product-detail-page',{product,user,cartCount})
})


router.get('/edit-profile',async (req,res)=>{
  let user=req.session.user
  let userDetails=await userHelper.getUserDetails(req.session.user._id)
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
 
  res.render('user/edit-profile',{user,userDetails,cartCount})
})
router.post('/edit-profile',(req,res)=>{
  let user=req.session.user
  userHelper.editUser(user._id,req.body).then(()=>{
  req.session.user.Name=req.body.Name
  console.log(req.body)
  res.redirect('/')
  
})
})



router.get('/products-list',async (req,res)=>{
  let user=req.session.user
  let cartCount=null;
  if(user){
    cartCount=await userHelper.getCartCount(req.session.user._id)
  }
  let pro=req.query.id
  console.log(req.query.id);
  let products;
  let prod
  let lap;
  let phone;
  let accss;
  if(pro==='lap'){
    console.log('hloooooohiiiii');
    products= await productHelper.getProductLaptop()
    prod='Laptops'
    lap=true
  }
  else if(pro==='phone'){
     products= await productHelper.getProductSmartphone()
     prod='SmartPhones'
     phone=true
  }
 else {
   products= await productHelper.getProductAccessories()
   prod='Accessories'
   accss=true
 }
  console.log(products);
  res.render('user/product-list',{user,products,cartCount,prod,lap,phone,accss})
})

router.post('/coupon-validation',(req,res)=>{
  console.log('hlooooooooooooooooooooooooooooooooooooooooooooooooooiiiiiiiiiiiiiiiiiiiiiiiiiii');
  console.log('coupon code')
  console.log(req.body.couponCode);
  total=req.body.total
 let response 
  if(req.body.couponCode===COUPON_CODE){
    console.log('hello its working')
    total=total/2;
response=true;

  }
  else{
    console.log('error')
    response=false
  }
  res.json({response,total})
    
})

module.exports = router;
