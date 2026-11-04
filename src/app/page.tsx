import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import { enrolledAccount } from "@/lib/accounts";
export default async function Home() { redirect((await enrolledAccount() || await authenticated()) ? "/studio" : "/pristup"); }
