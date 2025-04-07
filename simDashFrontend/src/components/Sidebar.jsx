import { useState } from 'react'
import { FaChartPie } from '@react-icons/all-files/fa/FaChartPie'
import { FaHome } from '@react-icons/all-files/fa/FaHome'
import { FaCog } from '@react-icons/all-files/fa/FaCog'
import { FaEllipsisV } from '@react-icons/all-files/fa/FaEllipsisV'
import { FaServer } from '@react-icons/all-files/fa/FaServer'
import { FaDesktop } from '@react-icons/all-files/fa/FaDesktop'

const Sidebar = () => {
  const [active, setActive] = useState('rooms')

  return (
    <div className="w-16 bg-primary flex flex-col items-center py-4 shadow-lg">
      <div className="mb-10">
        <div className="flex items-center justify-center">
          <div className="text-white text-2xl font-bold">
            <div className="flex flex-col items-center">
              <div className="flex">
                <FaServer className="text-white mr-1" />
                <FaDesktop className="text-white" />
              </div>
              <span className="text-xs mt-1">simDash</span>
            </div>
          </div>
        </div>
      </div>
      
      <nav className="flex flex-col items-center space-y-4 flex-1">
        <button 
          className={`p-3 rounded-lg ${active === 'rooms' ? 'bg-white text-primary' : 'text-white hover:bg-primary-dark'}`}
          onClick={() => setActive('rooms')}
        >
          <FaHome size={20} />
        </button>
        <button 
          className={`p-3 rounded-lg ${active === 'dashboard' ? 'bg-white text-primary' : 'text-white hover:bg-primary-dark'}`}
          onClick={() => setActive('dashboard')}
        >
          <FaChartPie size={20} />
        </button>
      </nav>
    </div>
  )
}

export default Sidebar