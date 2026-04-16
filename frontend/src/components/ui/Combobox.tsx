"use client"

import * as React from "react"
import { Combobox as BaseCombobox } from "@base-ui/react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/utils"

// Context to share items with ComboboxList
const ComboboxContext = React.createContext<{ items: any[] } | null>(null)

function useComboboxContext() {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error("Combobox sub-components must be rendered within a Combobox component")
  }
  return context
}

interface ComboboxProps<T> extends React.ComponentPropsWithoutRef<typeof BaseCombobox.Root> {
  items: T[]
}

function Combobox<T>({ items, children, ...props }: ComboboxProps<T>) {
  return (
    <ComboboxContext.Provider value={{ items }}>
      <BaseCombobox.Root {...props}>
        {children}
      </BaseCombobox.Root>
    </ComboboxContext.Provider>
  )
}

const ComboboxInput = React.forwardRef<
  React.ElementRef<typeof BaseCombobox.Input>,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Input> & {
    showClear?: boolean
    showTrigger?: boolean
  }
>(({ className, showClear = false, showTrigger = true, ...props }, ref) => (
  <div className="relative flex items-center w-full border border-gray-300 rounded-lg bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
    <BaseCombobox.Input
      ref={ref}
      className={cn(
        "flex h-10 w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
    <div className="flex items-center pr-2 gap-1">
      {showClear && props.value && (
        <button
          type="button"
          className="p-1 hover:bg-gray-100 rounded-md transition"
        >
          <X className="h-3.5 w-3.5 text-gray-400" />
        </button>
      )}
      {showTrigger && (
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 text-gray-400" />
      )}
    </div>
  </div>
))
ComboboxInput.displayName = "ComboboxInput"

const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof BaseCombobox.Portal>,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Portal>
>(({ children, ...props }, ref) => (
  <BaseCombobox.Portal ref={ref} {...props}>
    <BaseCombobox.Positioner sideOffset={4} className="z-50 w-[--radix-popover-trigger-width]">
      <BaseCombobox.Popup
        className={cn(
          "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white text-gray-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        )}
      >
        {children}
      </BaseCombobox.Popup>
    </BaseCombobox.Positioner>
  </BaseCombobox.Portal>
))
ComboboxContent.displayName = "ComboboxContent"

interface ComboboxListProps<T> extends React.ComponentPropsWithoutRef<typeof BaseCombobox.List> {
  children: (item: T) => React.ReactNode
}

function ComboboxList<T>({ children, className, ...props }: ComboboxListProps<T>) {
  const { items } = useComboboxContext()

  return (
    <BaseCombobox.List
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden p-1", className)}
      {...props}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {children(item)}
        </React.Fragment>
      ))}
    </BaseCombobox.List>
  )
}

const ComboboxItem = React.forwardRef<
  React.ElementRef<typeof BaseCombobox.Item>,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Item>
>(({ className, children, ...props }, ref) => (
  <BaseCombobox.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <BaseCombobox.ItemIndicator>
        <Check className="h-4 w-4 text-blue-600" />
      </BaseCombobox.ItemIndicator>
    </span>
    {children}
  </BaseCombobox.Item>
))
ComboboxItem.displayName = "ComboboxItem"

const ComboboxEmpty = React.forwardRef<
  React.ElementRef<typeof BaseCombobox.Empty>,
  React.ComponentPropsWithoutRef<typeof BaseCombobox.Empty>
>(({ className, ...props }, ref) => (
  <BaseCombobox.Empty
    ref={ref}
    className={cn("py-6 text-center text-sm text-gray-500", className)}
    {...props}
  />
))
ComboboxEmpty.displayName = "ComboboxEmpty"

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
}
