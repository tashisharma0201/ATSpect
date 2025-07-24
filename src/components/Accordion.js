import React, { createContext, useContext, useState } from "react"
import { cn } from "../utils/utils"

const AccordionContext = createContext(undefined)

const useAccordion = () => {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error("Accordion components must be used within an Accordion")
  }
  return context
}

export const Accordion = ({
  children,
  defaultOpen,
  allowMultiple = false,
  className = "",
}) => {
  const [activeItems, setActiveItems] = useState(
    defaultOpen ? [defaultOpen] : []
  )

  const toggleItem = (id) => {
    setActiveItems((prev) => {
      if (allowMultiple) {
        return prev.includes(id)
          ? prev.filter((item) => item !== id)
          : [...prev, id]
      } else {
        return prev.includes(id) ? [] : [id]
      }
    })
  }

  const isItemActive = (id) => activeItems.includes(id)

  return (
    <AccordionContext.Provider
      value={{
        activeItems,
        toggleItem,
        isItemActive,
      }}
    >
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

export const AccordionItem = ({
  id,
  children,
  className = "",
}) => {
  return (
    <div className={cn("border border-gray-200 rounded-lg", className)}>
      {children}
    </div>
  )
}

export const AccordionHeader = ({
  itemId,
  children,
  className = "",
  icon,
  iconPosition = "right",
}) => {
  const { toggleItem, isItemActive } = useAccordion()
  const isActive = isItemActive(itemId)

  const defaultIcon = (
    <svg
      className={cn(
        "w-5 h-5 transition-transform duration-200",
        isActive ? "transform rotate-180" : ""
      )}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  )

  const handleClick = () => {
    toggleItem(itemId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center justify-between p-4 text-left font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors",
        className
      )}
    >
      {iconPosition === "left" && (icon || defaultIcon)}
      <div className="flex-1">{children}</div>
      {iconPosition === "right" && (icon || defaultIcon)}
    </button>
  )
}

export const AccordionContent = ({
  itemId,
  children,
  className = "",
}) => {
  const { isItemActive } = useAccordion()
  const isActive = isItemActive(itemId)

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-200 ease-in-out",
        isActive ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
      )}
    >
      <div className={cn("p-4 pt-0", className)}>
        {children}
      </div>
    </div>
  )
}
