export default function StylesStep() {
    const styles = [
      { id: 1, name: "Professional", icon: "👔" },
      { id: 2, name: "Casual", icon: "👕" },
      { id: 3, name: "Cinematic", icon: "🎬" },
      { id: 4, name: "Animated", icon: "🎨" },
      { id: 5, name: "Documentary", icon: "📹" },
      { id: 6, name: "Educational", icon: "🎓" },
    ]
  
    return (
      <div className="min-h-[300px]">
        <div className="grid grid-cols-3 gap-4">
          {styles.map((style) => (
            <div
              key={style.id}
              className="border border-gray-200 rounded-md p-4 cursor-pointer hover:border-purple-400 hover:bg-purple-50"
            >
              <div className="text-2xl mb-2">{style.icon}</div>
              <div className="text-sm font-medium">{style.name}</div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Color Theme</h4>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 cursor-pointer"></div>
            <div className="w-8 h-8 rounded-full bg-purple-500 cursor-pointer border-2 border-gray-300"></div>
            <div className="w-8 h-8 rounded-full bg-green-500 cursor-pointer"></div>
            <div className="w-8 h-8 rounded-full bg-red-500 cursor-pointer"></div>
            <div className="w-8 h-8 rounded-full bg-yellow-500 cursor-pointer"></div>
          </div>
        </div>
      </div>
    )
  }