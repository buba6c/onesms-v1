-- Insert RICHER FALLBACK data for 'onlinesim_full_tariffs'
-- We will switch the function to use a single 'onlinesim_full_tariffs' key for everything.
-- This JSON mimics the actual API response from structure so the function can parse it.

INSERT INTO public.api_cache (key, value, expires_at)
VALUES (
    'onlinesim_full_tariffs',
    '{
      "response": "1",
      "countries": {
        "7": {
          "country": "Russia",
          "periods": {
             "4": { "count": 250, "price": "1.50" },
             "24": { "count": 150, "price": "3.00" },
             "168": { "count": 50, "price": "15.00" },
             "720": { "count": 20, "price": "50.00" }
          }
        },
        "380": {
          "country": "Ukraine",
          "periods": {
             "4": { "count": 50, "price": "1.80" },
             "24": { "count": 40, "price": "3.50" }
          }
        },
        "44": {
          "country": "United Kingdom",
          "periods": {
             "4": { "count": 300, "price": "2.50" },
             "24": { "count": 200, "price": "5.00" }
          }
        },
        "1": {
          "country": "USA",
          "periods": {
             "4": { "count": 500, "price": "2.00" },
             "24": { "count": 400, "price": "4.00" },
             "168": { "count": 100, "price": "20.00" },
             "720": { "count": 50, "price": "70.00" }
          }
        },
        "33": {
          "country": "France",
          "periods": {
             "4": { "count": 120, "price": "2.20" },
             "24": { "count": 100, "price": "4.50" }
          }
        },
        "49": {
          "country": "Germany",
          "periods": {
             "4": { "count": 80, "price": "2.50" },
             "24": { "count": 60, "price": "5.00" }
          }
        },
        "31": {
          "country": "Netherlands",
          "periods": {
             "4": { "count": 60, "price": "2.50" },
             "24": { "count": 50, "price": "5.00" }
          }
        },
        "48": {
          "country": "Poland",
          "periods": {
             "4": { "count": 90, "price": "1.50" },
             "24": { "count": 80, "price": "3.00" }
          }
        }
      }
    }'::jsonb,
    NOW() + INTERVAL '48 hours'
)
ON CONFLICT (key) DO UPDATE
SET 
    value = EXCLUDED.value,
    expires_at = EXCLUDED.expires_at;
