import app from "./app.js";
import { connectToDatabase } from "./db/connection.js";
const PORT = process.env.PORT || 5000;
connectToDatabase().then(()=>{
  app.listen(PORT,()=>console.log("Server open and connected"));
}).catch((err)=>console.log(err))

