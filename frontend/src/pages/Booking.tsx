import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { CalendarCheck, Clock, Loader2, MapPin, ChevronRight, ChevronLeft, Video, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { api, ApiError, type Booking, type BookingAvailabilityDay, type BookingEventType, type BookingCalendar, type BookingSlot } from "@/lib/api";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
  meetingPlatform: string;
  [key: string]: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  message: "",
  meetingPlatform: "",
};

const defaultMeetingLocations = [
  { id: "google-meet", label: "Google Meet", type: "google_meet", details: "", enabled: true },
  { id: "zoom", label: "Zoom", type: "zoom", details: "", enabled: true },
  { id: "whatsapp-call", label: "WhatsApp Call", type: "whatsapp", details: "", enabled: true },
  { id: "phone-call", label: "Phone Call", type: "phone", details: "", enabled: true },
  { id: "in-person", label: "In Person", type: "in_person", details: "", enabled: false },
];

function locationIcon(type: string) {
  if (type === "phone") return Phone;
  if (type === "whatsapp") return MessageSquare;
  if (type === "in_person") return MapPin;
  return Video;
}

function formatTime12Hour(timeStr: string) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function Booking() {
  const { slug } = useParams();
  const [calendar, setCalendar] = useState<BookingCalendar | null>(null);
  const [selectedType, setSelectedType] = useState<BookingEventType | null>(null);
  const [availability, setAvailability] = useState<BookingAvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookingSlot | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("12h");

  useEffect(() => {
    let cancelled = false;

    async function loadEventTypes() {
      setLoadingBooking(true);
      setError("");
      setCalendar(null);
      setSelectedType(null);
      setSelectedSlot(null);
      setSelectedDate(null);
      setCurrentStep(1);

      try {
        const params = new URLSearchParams(window.location.search);
        let calendarSlug = slug || params.get("calendar") || undefined;

        if (!calendarSlug) {
          const calendarsResult = await api.publicBookingCalendars();
          calendarSlug = calendarsResult.calendars[0]?.slug;
        }

        if (!calendarSlug) {
          throw new Error("No active booking calendar is available.");
        }

        const result = await api.publicBookingCalendar(calendarSlug);
        if (cancelled) return;
        const calendarResult = result as { calendar: BookingCalendar; eventTypes: BookingEventType[] };
        setCalendar(calendarResult.calendar);
        setSelectedType(result.eventTypes[0] || null);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load booking options.");
      } finally {
        if (!cancelled) setLoadingBooking(false);
      }
    }

    void loadEventTypes();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!selectedType) return;

    let cancelled = false;
    const eventType = selectedType;

    async function loadAvailability() {
      setLoadingSlots(true);
      setError("");
      setAvailability([]);
      setSelectedSlot(null);
      setSelectedDate(null);

      try {
        const result = await api.publicBookingAvailability(eventType.slug);
        if (cancelled) return;
        setAvailability(result.availability);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load available times.");
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }

    void loadAvailability();
    return () => {
      cancelled = true;
    };
  }, [selectedType]);

  const availableDates = useMemo(() => {
    return availability.map((day) => day.date);
  }, [availability]);

  const selectedDaySlots = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    return availability.find((day) => day.date === dateStr)?.slots || [];
  }, [availability, selectedDate]);

  const enabledMeetingLocations = useMemo(() => {
    const configured = calendar?.settings?.locations?.length ? calendar.settings.locations : defaultMeetingLocations;
    return configured.filter((location) => location.enabled !== false);
  }, [calendar]);

  const bookingQuestions = useMemo(() => {
    const formSettings = calendar?.settings?.form;
    const fields = [...(formSettings?.fields ?? []), ...(formSettings?.customFields ?? [])]
      .filter((field) => field.enabled !== false && !field.hidden)
      .map((field) => ({ ...field, options: field.options ?? [] }));

    if (enabledMeetingLocations.length > 0 && !fields.some((field) => field.type === "location" || field.key === "location")) {
      fields.push({
        key: "location",
        label: "Preferred Meeting Platform",
        type: "location",
        enabled: true,
        required: true,
        system: true,
        options: [],
      });
    }

    return fields;
  }, [calendar, enabledMeetingLocations]);

  const requiredQuestionsAnswered = useMemo(() => {
    return bookingQuestions.every((question) => {
      if (!question.required) return true;
      const key = question.type === "location" ? "meetingPlatform" : question.key;
      return Boolean((form[key] ?? "").trim());
    });
  }, [bookingQuestions, form]);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedType || !selectedSlot) {
      setError("Please choose a booking type and time.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const result = await api.createPublicBooking({
        eventTypeId: selectedType.id,
        startsAt: selectedSlot.startsAt,
        service: calendar?.name || selectedType.name,
        ...form,
      });
      setConfirmedBooking(result.booking);
      setCurrentStep(4);
      setForm(emptyForm);
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 409) {
        setError("That time was just taken. Please choose another slot.");
      } else {
        setError(saveError instanceof Error ? saveError.message : "Unable to complete booking.");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      setCurrentStep(2);
    }
  }

  function handlePrevStep() {
    if (currentStep === 2) {
      setCurrentStep(1);
      return;
    }

    if (currentStep === 3) {
      setSelectedSlot(null);
      setCurrentStep(window.matchMedia("(min-width: 1024px)").matches ? 1 : 2);
      return;
    }

    if (currentStep > 1) {
      setCurrentStep((step) => step - 1);
    }
  }

  const bookingTitle = calendar?.name || selectedType?.name || "Booking";
  const bookingDescription = calendar?.description || selectedType?.description || "";
  const locationSummary = enabledMeetingLocations.length === 1
    ? enabledMeetingLocations[0].label
    : `${enabledMeetingLocations.length} location options`;
  const selectedDateShort = selectedDate?.toLocaleDateString("default", { weekday: "short", day: "numeric" }) ?? "";
  const selectedDateLong = selectedDate?.toLocaleDateString("default", { month: "long", day: "numeric", year: "numeric" }) ?? "";
  const selectedSlotEndLabel = selectedSlot && selectedType
    ? new Date(new Date(selectedSlot.startsAt).getTime() + selectedType.durationMinutes * 60000).toTimeString().slice(0, 5)
    : "";
  const displaySlotTime = (slot: BookingSlot) => timeFormat === "12h" ? formatTime12Hour(slot.label) : slot.label;
  const displaySelectedRange = selectedSlot
    ? `${displaySlotTime(selectedSlot)} - ${timeFormat === "12h" ? formatTime12Hour(selectedSlotEndLabel) : selectedSlotEndLabel}`
    : "";

  function renderBookingSummary(compact = false) {
    if (!selectedType) return null;
    return (
      <div className={cn("grid gap-3", compact ? "text-sm" : "")}>
        <h1 className={cn("font-black text-gray-900", compact ? "text-2xl" : "text-3xl")}>{bookingTitle}</h1>
        <div className="grid gap-2 text-gray-700">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{selectedType.durationMinutes} Minutes</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4" />
            <span>{locationSummary}</span>
          </div>
          {selectedSlot && selectedDate ? (
            <div className="flex items-start gap-2">
              <CalendarCheck className="mt-0.5 h-4 w-4" />
              <span>{displaySelectedRange}, {selectedDateLong}</span>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{calendar?.timezone || selectedType.timezone || "Africa/Lagos"}</span>
          </div>
        </div>
        {bookingDescription ? <p className="pt-2 leading-7 text-gray-700">{bookingDescription}</p> : null}
      </div>
    );
  }

  function renderBookingQuestion(question: (typeof bookingQuestions)[number]) {
    const key = question.type === "location" ? "meetingPlatform" : question.key;
    const label = question.label || question.key;
    const required = Boolean(question.required);
    const value = form[key] ?? "";
    const updateValue = (nextValue: string) => setForm((current) => ({ ...current, [key]: nextValue }));
    const inputClass = "h-11 rounded-xl border border-gray-200 px-4 outline-none focus:border-blue-500";

    if (question.type === "location") {
      return (
        <div key={question.key} className="grid gap-2">
          <label className="text-xs font-semibold text-gray-700">{label}</label>
          <div className="grid grid-cols-2 gap-2">
            {enabledMeetingLocations.map((location) => {
              const Icon = locationIcon(location.type);
              return (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => updateValue(location.id)}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all",
                    value === location.id ? "border-blue-600 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{location.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (question.type === "message" || question.type === "textarea") {
      return (
        <div key={question.key} className="grid gap-2">
          <label htmlFor={question.key} className="text-xs font-semibold text-gray-700">{label}{required ? "" : " (optional)"}</label>
          <textarea id={question.key} className="h-24 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500" value={value} onChange={(event) => updateValue(event.target.value)} required={required} />
          {question.helpMessage ? <p className="text-xs text-gray-500">{question.helpMessage}</p> : null}
        </div>
      );
    }

    if (question.type === "dropdown") {
      return (
        <div key={question.key} className="grid gap-2">
          <label htmlFor={question.key} className="text-xs font-semibold text-gray-700">{label}</label>
          <select id={question.key} className={inputClass} value={value} onChange={(event) => updateValue(event.target.value)} required={required}>
            <option value="">Select</option>
            {(question.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          {question.helpMessage ? <p className="text-xs text-gray-500">{question.helpMessage}</p> : null}
        </div>
      );
    }

    if (question.type === "checkbox") {
      return (
        <label key={question.key} className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={value === "yes"} onChange={(event) => updateValue(event.target.checked ? "yes" : "")} required={required} />
          {label}
        </label>
      );
    }

    const inputType = question.type === "phone" ? "tel" : question.type === "name" ? "text" : question.type;
    return (
      <div key={question.key} className="grid gap-2">
        <label htmlFor={question.key} className="text-xs font-semibold text-gray-700">{label}</label>
        <input id={question.key} type={inputType} className={inputClass} value={value} onChange={(event) => updateValue(event.target.value)} required={required} />
        {question.helpMessage ? <p className="text-xs text-gray-500">{question.helpMessage}</p> : null}
      </div>
    );
  }

  if (loadingBooking) {
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 pt-24">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading booking calendar...
        </div>
      </div>
    );
  }

  if (!selectedType || !calendar) {
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 pt-24 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking calendar unavailable</h1>
          <p className="mt-3 text-gray-500">{error || "No active booking type has been configured for this calendar."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 pt-24">
      {currentStep === 1 && (
        <div className="mx-auto hidden max-w-7xl overflow-hidden rounded-2xl border border-gray-200 bg-white lg:grid lg:grid-cols-[0.8fr_1fr_0.75fr]">
          <aside className="border-r border-gray-200 p-8">
            {renderBookingSummary(false)}
          </aside>

          <section className="border-r border-gray-200 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-900">
                {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-blue-600" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="flex h-72 items-center justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading available dates...
                </div>
              </div>
            ) : (
              <Calendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} availableDates={availableDates} selectedDate={selectedDate} onDateSelect={handleDateSelect} />
            )}

            <div className="mt-8">
              <h4 className="mb-3 text-lg font-black text-gray-900">Timezone</h4>
              <div className="h-12 rounded-xl border border-gray-200 px-4 py-3 text-gray-700">{calendar.timezone || selectedType.timezone || "Africa/Lagos"}</div>
            </div>
          </section>

          <aside className="max-h-[42rem] overflow-y-auto p-8">
            <div className="mb-5 flex items-center justify-between">
              <h4 className="text-lg font-black text-gray-900">{selectedDateShort || "Select date"}</h4>
              <div className="rounded-lg border border-gray-200 bg-white p-1 text-xs font-bold">
                <button type="button" onClick={() => setTimeFormat("12h")} className={cn("rounded-md px-2 py-1", timeFormat === "12h" ? "bg-gray-100 text-gray-900" : "text-gray-500")}>12h</button>
                <button type="button" onClick={() => setTimeFormat("24h")} className={cn("rounded-md px-2 py-1", timeFormat === "24h" ? "bg-gray-100 text-gray-900" : "text-gray-500")}>24h</button>
              </div>
            </div>

            {selectedDaySlots.length > 0 ? (
              <div className="grid gap-4">
                {selectedDaySlots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot);
                      setCurrentStep(3);
                    }}
                    className="h-14 rounded-lg border border-gray-200 bg-white px-5 text-left text-base font-medium text-gray-900 transition hover:border-blue-500 hover:bg-blue-50"
                  >
                    {displaySlotTime(slot)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                {selectedDate ? "No available times for this date." : "Select a date to see available times."}
              </p>
            )}
          </aside>
        </div>
      )}

      {currentStep === 1 && (
        <div className="mx-auto grid max-w-md gap-8 lg:hidden">
          {renderBookingSummary(true)}
          <div className="grid gap-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">
                {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
              </h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-500" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-blue-600" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {loadingSlots ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading available dates...
                </div>
              </div>
            ) : (
              <Calendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} availableDates={availableDates} selectedDate={selectedDate} onDateSelect={handleDateSelect} />
            )}
          </div>
        </div>
      )}

      {currentStep === 2 && selectedDate && (
        <div className="mx-auto grid max-w-md gap-8">
          {renderBookingSummary(true)}
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={handlePrevStep} className="flex items-center gap-3 text-sm font-bold text-gray-900">
                <span className="grid h-9 w-9 place-items-center rounded-full border border-gray-200"><ChevronLeft className="h-4 w-4" /></span>
                {selectedDateShort}
              </button>
              <div className="rounded-lg border border-gray-200 bg-white p-1 text-xs font-bold">
                <button type="button" onClick={() => setTimeFormat("12h")} className={cn("rounded-md px-2 py-1", timeFormat === "12h" ? "bg-gray-100 text-gray-900" : "text-gray-500")}>12h</button>
                <button type="button" onClick={() => setTimeFormat("24h")} className={cn("rounded-md px-2 py-1", timeFormat === "24h" ? "bg-gray-100 text-gray-900" : "text-gray-500")}>24h</button>
              </div>
            </div>

            {selectedDaySlots.length > 0 ? (
              <div className="grid gap-3">
                {selectedDaySlots.map((slot, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setSelectedSlot(slot);
                      setCurrentStep(3);
                    }}
                    className="h-11 rounded border border-gray-200 bg-white px-4 text-left text-sm font-medium text-gray-900 transition hover:border-blue-500 hover:bg-blue-50"
                  >
                    {displaySlotTime(slot)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">No available times for this date.</p>
            )}
          </div>
        </div>
      )}

      {currentStep === 3 && selectedSlot && (
        <div className="mx-auto grid max-w-md gap-6 lg:max-w-5xl lg:grid-cols-[0.85fr_1.15fr] lg:overflow-hidden lg:rounded-2xl lg:border lg:border-gray-200">
          <aside className="hidden border-r border-gray-200 p-8 lg:block">
            {renderBookingSummary(false)}
          </aside>

          <div className="grid gap-6 lg:p-8">
            <div className="flex items-center gap-3 border-b border-gray-200 pb-4 lg:border-b-0 lg:pb-0">
              <button
                type="button"
                onClick={handlePrevStep}
                className="grid h-9 w-9 place-items-center rounded-full border border-gray-200"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-black text-gray-900">Enter Details</h3>
            </div>

            <div className="lg:hidden">
              {renderBookingSummary(true)}
            </div>

            <form onSubmit={submitBooking} className="grid gap-4">
              {bookingQuestions.map((question) => renderBookingQuestion(question))}

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</p>
              )}

              <Button
                type="submit"
                className="h-11 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                disabled={saving || !requiredQuestionsAnswered}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Booking..." : "Confirm Booking"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {false && currentStep === 2 && selectedSlot && (
        <div className="max-w-xl mx-auto px-4 py-8 md:py-16 pt-24">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Enter Your Details</h3>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full border border-gray-200"
                onClick={handlePrevStep}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 flex items-center gap-4">
              <div className="bg-blue-100 rounded-lg p-3">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {selectedDate?.toLocaleDateString("default", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-gray-600 text-sm">
                  {formatTime12Hour(selectedSlot?.label ?? "")} · {selectedType?.durationMinutes} min
                </p>
              </div>
            </div>

            <form onSubmit={submitBooking} className="grid gap-4">
              <div className="grid gap-4">
                {bookingQuestions.map((question) => renderBookingQuestion(question))}
              </div>

              {error && (
                <p className="text-red-600 text-xs font-semibold bg-red-50 rounded-xl px-4 py-3">{error}</p>
              )}

              <Button
                type="submit"
                className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white w-full"
                disabled={saving || !requiredQuestionsAnswered}
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Booking..." : "Confirm Booking"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {currentStep === 4 && confirmedBooking && (
        <div className="max-w-xl mx-auto px-4 py-8 md:py-16 pt-24">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CalendarCheck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
            <p className="text-gray-600 mb-6">
              Thank you for your booking. We've sent a confirmation email to {confirmedBooking.email}.
            </p>

            <div className="bg-gray-50 rounded-xl p-5 text-left mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Booking Details</h4>
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Service</span>
                  <span className="font-semibold text-gray-900 text-sm">{confirmedBooking.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Date & Time</span>
                  <span className="font-semibold text-gray-900 text-sm">
                    {new Date(confirmedBooking.startsAt).toLocaleDateString("default", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    at {formatTime12Hour(new Date(confirmedBooking.startsAt).toTimeString().slice(0, 5))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Name</span>
                  <span className="font-semibold text-gray-900 text-sm">{confirmedBooking.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 text-sm">Email</span>
                  <span className="font-semibold text-gray-900 text-sm">{confirmedBooking.email}</span>
                </div>
              </div>
            </div>

            <Button
              className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white w-full"
              onClick={() => {
                setCurrentStep(1);
                setConfirmedBooking(null);
              }}
            >
              Book Another Time
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
