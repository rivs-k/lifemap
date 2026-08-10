export default function ChampTexte({ id, label, children, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-200 mb-2 font-bold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="w-full bg-black/60 backdrop-blur-sm border border-gray-600 rounded-xl px-5 py-4 text-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-teal-500"
        {...props}
      />
      {children}
    </div>
  );
}
