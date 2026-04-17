"use client"

import * as React from "react"
import { Combobox as BaseCombobox } from "@base-ui/react/combobox"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Access sub-components from the main Combobox export
const ComboboxRoot = BaseCombobox.Root
const ComboboxInput = BaseCombobox.Input
const ComboboxInputGroup = BaseCombobox.InputGroup
const ComboboxClear = BaseCombobox.Clear
const ComboboxTrigger = BaseCombobox.Trigger
const ComboboxPortal = BaseCombobox.Portal
const ComboboxPositioner = BaseCombobox.Positioner
const ComboboxPopup = BaseCombobox.Popup
const ComboboxCollection = BaseCombobox.Collection
const ComboboxList = BaseCombobox.List
const ComboboxItem = BaseCombobox.Item
const ComboboxItemIndicator = BaseCombobox.ItemIndicator
const ComboboxEmpty = BaseCombobox.Empty
const ComboboxValue = BaseCombobox.Value

interface ComboboxProps<T> { 
  items: T[]
  value?: T | null
  onValueChange?: (value: T | null) => void
  children: React.ReactNode
  itemToString?: (item: T) => string  // Convert item to display string
  itemToSearchString?: (item: T) => string // Convert item to search string
}

function Combobox<T extends { id?: any }>({
  items,
  value,
  onValueChange,
  children,
  itemToString,
  itemToSearchString,
}: ComboboxProps<T>) {
  const toString = itemToString || ((item: T) => String(item));
  const toSearchString = itemToSearchString || toString;
  
  const customFilter = React.useCallback((item: T, query: string) => {
    const searchString = toSearchString(item).toLowerCase();
    const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return searchTerms.every(term => searchString.includes(term));
  }, [toSearchString]);
  
  return (
    <ComboboxRoot
      items={items}
      value={value}
      onValueChange={onValueChange}
      itemToStringLabel={toString}
      filter={customFilter}
    >
      {children}
    </ComboboxRoot>
  )
}

interface ComboboxInputProps {
  placeholder?: string
  showClear?: boolean
  showTrigger?: boolean
  className?: string
}

const ComboboxInputComponent = React.forwardRef<
  React.ElementRef<typeof ComboboxInput>,
  ComboboxInputProps
>(({ className, placeholder, showClear = true, showTrigger = true }, ref) => {
  return (
    <ComboboxInputGroup className="relative flex items-center w-full">
      <ComboboxInput
        ref={ref}
        placeholder={placeholder}
        className={cn(
          "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 outline-none transition focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
      {showClear && (
        <ComboboxClear className="absolute right-10 p-1 hover:bg-gray-100 rounded-md transition cursor-pointer">
          <X className="h-3.5 w-3.5 text-gray-400" />
        </ComboboxClear>
      )}
      {showTrigger && (
        <ComboboxTrigger className="absolute right-2 p-1 hover:bg-gray-100 rounded-md transition cursor-pointer">
          <ChevronsUpDown className="h-4 w-4 text-gray-400" />
        </ComboboxTrigger>
      )}
    </ComboboxInputGroup>
  )
})
ComboboxInputComponent.displayName = "ComboboxInput"

interface ComboboxContentProps {
  children: React.ReactNode
  className?: string
}

const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof ComboboxPortal>,
  ComboboxContentProps
>(({ children, className }, ref) => {
  return (
    <ComboboxPortal ref={ref}>
      <ComboboxPositioner sideOffset={4} className="z-50">
        <ComboboxPopup
          className={cn(
            "relative z-50 min-w-[8rem] w-[var(--anchor-width)] overflow-hidden rounded-lg border border-gray-200 bg-white text-gray-900 shadow-lg data-[side=bottom]:animate-in data-[side=top]:animate-in data-[side=bottom]:fade-in-0 data-[side=top]:fade-in-0 data-[side=bottom]:zoom-in-95 data-[side=top]:zoom-in-95",
            "max-h-[300px]",
            className
          )}
        >
          {children}
        </ComboboxPopup>
      </ComboboxPositioner>
    </ComboboxPortal>
  )
})
ComboboxContent.displayName = "ComboboxContent"

interface ComboboxListProps<T> {
  children: (item: T) => React.ReactNode
  className?: string
}

function ComboboxListComponent<T>({ children, className }: ComboboxListProps<T>) {
  return (
    <ComboboxList className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden p-1", className)}>
      <ComboboxCollection>
        {(item: T, index: number) => (
          <React.Fragment key={index}>
            {children(item)}
          </React.Fragment>
        )}
      </ComboboxCollection>
    </ComboboxList>
  )
}

interface ComboboxItemProps<T> {
  value: T
  children: React.ReactNode
  className?: string
}

const ComboboxItemComponent = React.forwardRef<
  React.ElementRef<typeof ComboboxItem>,
  ComboboxItemProps<any>
>(({ value, children, className }, ref) => {
  return (
    <ComboboxItem
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900 data-[selected]:bg-blue-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-gray-50",
        className
      )}
    >
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <ComboboxItemIndicator>
          <Check className="h-4 w-4 text-blue-600" />
        </ComboboxItemIndicator>
      </span>
      <span className="pr-6">{children}</span>
    </ComboboxItem>
  )
})
ComboboxItemComponent.displayName = "ComboboxItem"

const ComboboxEmptyComponent = React.forwardRef<
  React.ElementRef<typeof ComboboxEmpty>,
  React.ComponentPropsWithoutRef<typeof ComboboxEmpty>
>(({ className, ...props }, ref) => {
  return (
    <ComboboxEmpty
      ref={ref}
      className={cn("py-6 text-center text-sm text-gray-500", className)}
      {...props}
    />
  )
})
ComboboxEmptyComponent.displayName = "ComboboxEmpty"

export {
  Combobox,
  ComboboxInputComponent as ComboboxInput,
  ComboboxContent,
  ComboboxListComponent as ComboboxList,
  ComboboxItemComponent as ComboboxItem,
  ComboboxEmptyComponent as ComboboxEmpty,
}
