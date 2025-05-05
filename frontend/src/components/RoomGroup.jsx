import { useState } from 'react'
import StrictModeDroppable from './StrictModeDroppable'
import SimulatorCard from './SimulatorCard'
import { FaCog } from '@react-icons/all-files/fa/FaCog'
import { Card } from './ui/card'

const RoomGroup = ({
    room,
    simulators,
    onAddToRoom,
    onRemoveFromRoom,
    onEditSimulatorTitle,
    allRooms,
    droppableId,
    isStandalone = false
}) => {
    const [isExpanded, setIsExpanded] = useState(true)

    return (
        <Card className="overflow-hidden">
            {!isStandalone && (
                <div className="p-4 border-b flex justify-between items-center">
                    <div className="flex items-center">
                        <h2 className="text-xl font-semibold">{room?.title || 'Room'}</h2>
                        <button
                            className="ml-2 text-muted-foreground hover:text-primary"
                            onClick={() => setIsExpanded(!isExpanded)}
                        >
                            {isExpanded ? '▼' : '►'}
                        </button>
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-primary rounded-full">
                        <FaCog />
                    </button>
                </div>
            )}

            <StrictModeDroppable
                droppableId={droppableId}
                type="SIMULATOR"
                direction="horizontal"
                isDropDisabled={!isExpanded && !isStandalone}
            >
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`transition-all duration-300 ${(!isExpanded && !isStandalone) ? 'h-0 overflow-hidden p-0' : 'p-4'
                            } ${snapshot.isDraggingOver ? 'bg-accent/50 rounded-lg' : ''
                            }`}
                    >
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${simulators.length === 0 ? 'min-h-[100px]' : ''}`}>
                            {simulators.map((simulator, index) => (
                                <SimulatorCard
                                    key={simulator.id}
                                    simulator={simulator}
                                    index={index}
                                    onEditTitle={onEditSimulatorTitle}
                                    onRemoveFromRoom={(simulatorId) => onRemoveFromRoom(simulatorId, room?.id)}
                                    rooms={isStandalone ? allRooms : allRooms?.filter(r => r.id !== room.id)}
                                    onAddToRoom={(roomId) => onAddToRoom(simulator.id, roomId)}
                                    inRoom={!isStandalone}
                                />
                            ))}

                            {/* Empty state */}
                            {simulators.length === 0 && (
                                <div className="h-24 col-span-3 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground">
                                    Drop simulators here
                                </div>
                            )}

                            {/* This must be AFTER all draggable items for react-beautiful-dnd to work */}
                            {provided.placeholder}
                        </div>
                    </div>
                )}
            </StrictModeDroppable>
        </Card>
    )
}

export default RoomGroup