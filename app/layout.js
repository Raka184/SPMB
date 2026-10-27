import "./globals.css";

export const metadata = {
  title: "SPMB Online | SMK Nan Jaya",
  description: "Portal Penerimaan Murid Baru SMK Nan Jaya.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
