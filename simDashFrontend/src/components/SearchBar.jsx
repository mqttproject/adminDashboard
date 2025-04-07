import { useState } from 'react'
import { FaSearch } from '@react-icons/all-files/fa/FaSearch'

const SearchBar = ({ onSearch }) => {
  const [value, setValue] = useState('')

  const handleChange = (e) => {
    setValue(e.target.value)
    onSearch(e.target.value)
  }

  return (
    <div className="relative w-64">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FaSearch className="text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm"
        placeholder="Search..."
        value={value}
        onChange={handleChange}
      />
    </div>
  )
}

export default SearchBar