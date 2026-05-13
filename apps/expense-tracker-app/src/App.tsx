import { useQuery } from "@tanstack/react-query"; // 1. Standard TanStack hook
import { orpc } from "./lib/orpc"; // 2. Your oRPC bridge

const App = () => {
  // Instead of manually writing keys and fetch functions,
  // orpc.queryOptions() generates them for you!
  const { data, isPending, error } = useQuery(
    orpc.listCategories.queryOptions(),
  );

  if (isPending) return <div className="p-10">Connecting to Supabase...</div>;

  if (error)
    return <div className="p-10 text-red-500">Error: {error.message}</div>;

  return (
    <div className="p-10 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-blue-600 font-sans">
        Expense Tracker
      </h1>

      <ul className="space-y-2">
        {data?.map((category) => (
          <li
            key={category.id}
            className="p-3 bg-white shadow-sm rounded border border-gray-200"
          >
            <span className="font-medium">{category.name}</span>
            <span className="ml-2 text-xs text-gray-400 uppercase">
              {category.type}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
