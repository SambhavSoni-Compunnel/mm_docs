import { redirect } from "next/navigation";
import { getAllDocFiles } from "@/lib/docs";

export default function HomePage() {
  const allDocs = getAllDocFiles();
  if (allDocs.length > 0) {
    redirect(`/docs/${allDocs[0].slug.join("/")}`);
  }
  redirect("/docs");
}
