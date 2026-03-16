import "styles/index.css";


export const metadata = {
  title: "Project Place",
  icons: {
    icon: "/willow.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
