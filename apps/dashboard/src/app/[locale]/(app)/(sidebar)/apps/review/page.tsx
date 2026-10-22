import { ConnectedAppActions } from "@/components/connected-app-actions";
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <main className="max-w-2xl space-y-4"><h1 className="text-xl">Review connected account action</h1><ConnectedAppActions reviewId={id} /></main>;
}
