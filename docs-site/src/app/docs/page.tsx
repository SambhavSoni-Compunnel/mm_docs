import { getAllDocFiles } from "@/lib/docs";
import { redirect } from "next/navigation";

export default function DocsIndexPage() {
  const allDocs = getAllDocFiles();
  if (allDocs.length > 0) {
    redirect(`/docs/${allDocs[0].slug.join("/")}`);
  }

  return (
    <div className="p-8 text-muted-foreground">No documentation found.</div>
  );
}
