import { useState } from 'react'
import { FaSearch } from '@react-icons/all-files/fa/FaSearch'
import { Input } from './ui/input'

const SearchBar = ({ onSearch, disabled = false }) => {
    const [value, setValue] = useState('')

    const handleChange = (e) => {
        const newValue = e.target.value
        setValue(newValue)
        onSearch(newValue)
    }

    return (
        <div className="relative">
            <Input
                type="text"
                className="pl-10 pr-4 py-2 border rounded-lg"
                placeholder="Search simulators..."
                value={value}
                onChange={handleChange}
                disabled={disabled}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-muted-foreground" />
            </div>
        </div>
    )
}

export default SearchBar