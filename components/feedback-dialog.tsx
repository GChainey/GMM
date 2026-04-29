"use client"

import { useState } from "react"
import { MessageSquareIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { FeedbackForm } from "@/components/feedback-form"

interface FeedbackDialogProps {
  trigger?: React.ReactElement
}

const defaultTrigger = (
  <Button
    variant="outline"
    size="sm"
    className="font-display tracking-widest"
  >
    <MessageSquareIcon className="size-4" />
    <span className="hidden sm:inline">Feedback</span>
  </Button>
)

export function FeedbackDialog({ trigger = defaultTrigger }: FeedbackDialogProps) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border/60">
          <SheetTitle className="font-display tracking-widest">
            Speak unto Gareth
          </SheetTitle>
          <SheetDescription>
            Bug, idea, plea, complaint — anything goes. Each note opens a
            ticket straight on Gareth&apos;s GitHub.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <FeedbackForm variant="plain" onSubmitted={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
