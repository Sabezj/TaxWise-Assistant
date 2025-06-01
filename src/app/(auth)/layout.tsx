
import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-xl font-bold text-primary hover:opacity-80 transition-opacity">
         <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-6 w-6"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
        TaxWise
      </Link>
      <div className="w-full max-w-md">
        {children}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Streamline your tax process with AI.
      </p>
    </div>
  );
}
