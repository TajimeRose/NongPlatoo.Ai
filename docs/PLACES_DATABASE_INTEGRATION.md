# Places Page Database Integration

## Summary of Changes

The Places page has been updated to fetch data from the backend database instead of using static/hardcoded data.

## What Changed

### 1. **Frontend: Places.tsx Component** (`frontend/src/pages/Places.tsx`)
   
   **Previous Approach:**
   - Imported static `places` array from `/data/places.ts`
   - No loading or error handling
   - Filtered static data based on user selections

   **New Approach:**
   - Fetches places from `/api/places` backend endpoint
   - Displays loading spinner while fetching
   - Shows error message if fetch fails
   - Transforms database response to match component's expected format
   - All filtering still works the same way

   **Key Changes:**
   - Added `useEffect` hook to fetch data on component mount
   - Added `allPlaces` state to store fetched data
   - Added `loading` and `error` states for UI feedback
   - Updated header to show "Loading places..." during fetch
   - Added loading state UI with spinner
   - Added error state UI with error message display

### 2. **Data Filter Function** (`frontend/src/data/places.ts`)

   **Previous Signature:**
   ```typescript
   filterPlaces(district?, category?, search?)
   ```

   **New Signature:**
   ```typescript
   filterPlaces(placesToFilter[], district?, category?, search?)
   ```

   The function now accepts the array of places as the first parameter, making it flexible to work with both static and dynamic data.

### 3. **API Endpoint Used**

   Backend endpoint: `GET /api/places`
   
   **Response Format:**
   ```json
   {
     "success": true,
     "places": [
       {
         "place_id": "123",
         "name": "Place Name",
         "category": "market",
         "description": "...",
         "address": "...",
         "image_urls": ["url1", "url2"],
         "rating": 4.5,
         "attraction_type": "market",
         ...
       }
     ],
     "count": 6
   }
   ```

   **Transformation Applied:**
   - `place_id` or `id` → `id`
   - `name` → `name` & `nameTh` (fallback)
   - `address` → `location`
   - `image_urls[0]` → `image`
   - `category` → `category` & `tags`
   - Default `rating: 4.0` if not provided
   - Default `isOpen: true`

## How It Works

1. **Component Mount:** When Places component loads, useEffect triggers
2. **API Call:** Fetches data from `/api/places` endpoint
3. **Loading State:** Shows spinner and "Loading places..." message
4. **Data Transform:** Converts database format to component format
5. **Store Data:** Places stored in `allPlaces` state
6. **Filtering:** User filters are applied to fetched data (same logic as before)
7. **Display:** Grid of place cards renders with fetched data

## Error Handling

If the API fails:
- Shows error banner with message
- Still displays empty state UI
- User can see what went wrong
- Can retry by refreshing page

## Backward Compatibility

- Static `places` array still exists in `/data/places.ts` for reference
- `getPlaceById()` function remains unchanged
- All existing PlaceCard components work without modification

## Benefits

✅ **Real-time Data:** Places come from live database  
✅ **Scalable:** Can support unlimited places  
✅ **Maintainable:** Single source of truth (database)  
✅ **Error Handling:** Graceful error states  
✅ **User Feedback:** Loading indicator for better UX  

## Testing

To test the integration:

1. Start backend server (should have database with places)
2. Start frontend dev server
3. Navigate to Places page
4. Verify:
   - Places load from API (check Network tab)
   - Filters work correctly
   - Search functionality works
   - Error handling works (if database is down)
   - Empty state displays if no places match filters

## Future Enhancements

- Add pagination for large datasets
- Add sorting options (distance, rating, etc.)
- Add caching to reduce API calls
- Add infinite scroll instead of grid pagination
- Add real-time filter counts from API
