import { SignIn } from "@clerk/nextjs"

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-screen relative bg-[#050505]">
      {}
      <div className="pointer-events-none absolute w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[80px] -z-10 animate-pulse"></div>
      <SignIn routing="path" path="/login" signUpUrl="/register" />
    </div>
  )
}
