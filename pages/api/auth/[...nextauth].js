import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
// import TelegramProvider from "next-auth/providers/telegram";

// 🔍 Debug: log env vars (jangan lupa hapus di production!)
console.log("NEXTAUTH_SECRET:", process.env.NEXTAUTH_SECRET);
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET);

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // TelegramProvider({
    //   clientId: process.env.TELEGRAM_CLIENT_ID,
    //   clientSecret: process.env.TELEGRAM_CLIENT_SECRET,
    // }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token, user }) {
      return session;
    },
  },
});
