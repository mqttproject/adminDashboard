import { useState } from 'react'
import { FaSearch } from '@react-icons/all-files/fa/FaSearch'

const SearchBar = ({ onSearch, disabled = false }) => {
    const [value, setValue] = useState('')

    const handleChange = (e) => {
        const newValue = e.target.value
        setValue(newValue)
        onSearch(newValue)
    }

    return (
        <div className="relative">
            <input
                type="text"
                className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Search instances..."
                value={value}
                onChange={handleChange}
                disabled={disabled}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
            </div>
        </div>
    )
}

export default SearchBar