import db from "@/app/lib/db";

export async function GET() {
     try {
        const [rows] = await db.query("SELECT 1 AS berhasil");

         return Response.json({
             success: true,
             message: "Database berhasil terhubung",
             data: rows,
         });
        } catch (error) {
              return Response.json(      
                {        
                    success: false,        
                    message: "Database gagal terhubung",        
                    error: error.message,      
                },      
                { status: 500 }   
             );  
            } 
        }