import { useState } from 'react'
import { DragDropContext } from 'react-beautiful-dnd'
import RoomGroup from './RoomGroup'
import SearchBar from './SearchBar'

const Dashboard = ({ simulators, rooms, onAddToRoom, onRemoveFromRoom, onEditSimulatorTitle }) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [isDragging, setIsDragging] = useState(false)

    // Filter out the 'unassigned' room if it exists in DB (we'll calculate it dynamically)
    const regularRooms = rooms.filter(room => room.id !== 'unassigned')
    
    // Calculate standalone simulators - all simulators not assigned to any room
    const assignedSimulatorIds = new Set();
    regularRooms.forEach(room => {
        if (room.simulatorIds) {
            room.simulatorIds.forEach(id => assignedSimulatorIds.add(id))
        } else if (room.simulators) {
            // Handle both field names (simulatorIds or simulators)
            room.simulators.forEach(id => assignedSimulatorIds.add(id))
        }
    });
    
    // Find simulators not assigned to any room
    const standaloneSimulators = simulators.filter(simulator => 
        !assignedSimulatorIds.has(simulator.id)
    );
    
    // Create a virtual "standalone simulators" room
    const standaloneRoom = {
        id: 'standalone',
        title: 'Standalone Simulators',
        simulators: standaloneSimulators.map(simulator => simulator.id)
    };
    
    // Filter regular rooms based on search term
    const filteredRooms = isDragging
        ? regularRooms
        : regularRooms.filter(room => {
            const roomSimulators = room.simulatorIds || room.simulators || [];
            return room.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                roomSimulators.some(simulatorId => {
                    const simulator = simulators.find(s => s.id === simulatorId)
                    return simulator && (
                        simulator.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        simulator.id.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                })
        })

    // Filter standalone simulators based on search term
    const filteredStandaloneSimulators = isDragging
        ? standaloneSimulators
        : standaloneSimulators.filter(simulator =>
            simulator.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            simulator.id.toLowerCase().includes(searchTerm.toLowerCase())
        )

    const handleDragStart = () => {
        setIsDragging(true);
    };

    const handleDragEnd = (result) => {
        setIsDragging(false);

        const { destination, source, draggableId } = result;

        // Dropped outside a droppable area
        if (!destination) {
            return;
        }

        // Dropped in the same place
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Moving between different areas
        if (source.droppableId !== destination.droppableId) {
            if (source.droppableId === 'standalone') {
                // Moving from standalone to a room
                onAddToRoom(draggableId, destination.droppableId);
            } else if (destination.droppableId === 'standalone') {
                // Moving to standalone (removing from a room)
                onRemoveFromRoom(draggableId, source.droppableId);
            } else {
                // Moving from one room to another
                onAddToRoom(draggableId, destination.droppableId);
            }
        }
    };

    return (
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Rooms</h1>
                    <SearchBar onSearch={setSearchTerm} disabled={isDragging} />
                </div>

                <div className="space-y-6 pb-6">
                    {filteredRooms.map(room => (
                        <RoomGroup
                            key={room.id}
                            room={room}
                            simulators={simulators.filter(simulator => 
                                (room.simulatorIds?.includes(simulator.id) || 
                                 room.simulators?.includes(simulator.id))
                            )}
                            onRemoveFromRoom={onRemoveFromRoom}
                            onAddToRoom={onAddToRoom}
                            onEditSimulatorTitle={onEditSimulatorTitle}
                            allRooms={regularRooms}
                            droppableId={room.id}
                        />
                    ))}

                    {/* Standalone Simulators Section */}
                    <RoomGroup
                        isStandalone={true}
                        room={standaloneRoom}
                        simulators={filteredStandaloneSimulators}
                        onEditSimulatorTitle={onEditSimulatorTitle}
                        allRooms={regularRooms}
                        onRemoveFromRoom={onRemoveFromRoom}
                        onAddToRoom={onAddToRoom}
                        droppableId="standalone"
                    />
                </div>
            </div>
        </DragDropContext>
    );
};

export default Dashboard