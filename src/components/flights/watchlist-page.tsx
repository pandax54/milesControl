'use client';

import { useState } from 'react';
import { BookmarkX } from 'lucide-react';
import { AddWatchlistForm } from './add-watchlist-form';
import { WatchlistItemCard } from './watchlist-item-card';
import type { WatchlistItem } from '@/lib/services/flight-watchlist.service';

// ==================== Types ====================

interface WatchlistPageProps {
  initialItems: WatchlistItem[];
}

// ==================== Component ====================

export function WatchlistPage({ initialItems }: WatchlistPageProps) {
  const [items, setItems] = useState<WatchlistItem[]>(initialItems);
  const [showForm, setShowForm] = useState(initialItems.length === 0);

  // Reload is handled by revalidatePath in the server actions, but we toggle
  // visibility locally for an immediate UX response.
  function handleChanged() {
    setShowForm(false);
  }

  function handleAdded() {
    setShowForm(false);
  }

  return (
    <div className="space-y-6">
      {/* Add form toggle */}
      {!showForm && (
        <div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            + Add new route to watchlist
          </button>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div>
          <AddWatchlistForm onAdded={handleAdded} />
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Watchlist items */}
      {items.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Watched Routes <span className="text-muted-foreground font-normal text-sm">({items.length})</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <WatchlistItemCard
                key={item.id}
                item={item}
                onChanged={handleChanged}
              />
            ))}
          </div>
        </div>
      ) : (
        !showForm && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <BookmarkX className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No routes on watchlist</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add routes with target prices and get alerted when prices drop.
            </p>
          </div>
        )
      )}
    </div>
  );
}
