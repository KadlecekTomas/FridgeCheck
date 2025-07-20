export function FoodList({ foods, fridgeId }: { foods: any[]; fridgeId: string }) {
  return (
    <div className="space-y-4">
      {foods.map((food) => (
        <div key={food.id} className="p-4 bg-white rounded shadow">
          <p className="font-semibold">{food.name}</p>
          <p className="text-sm text-gray-500">Expirace: {new Date(food.expiration).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  )
}
