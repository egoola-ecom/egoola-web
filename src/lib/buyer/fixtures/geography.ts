// Bangladesh: divisions (states), districts (cities) and a few thanas, in the
// shape of the public geography API.
export interface GeoRow { id: number; name: string; slug: string; country?: number; state?: number; city?: number }

export const COUNTRY = { id: 126, name: "Bangladesh", slug: "bangladesh", country_code: "BD", flag_url: null };

const DIVISIONS: Record<string, string[]> = {
  Dhaka: ["Dhaka", "Gazipur", "Narayanganj", "Narsingdi", "Manikganj", "Munshiganj", "Tangail", "Kishoreganj", "Faridpur", "Gopalganj", "Madaripur", "Rajbari", "Shariatpur"],
  Chattogram: ["Chattogram", "Cox's Bazar", "Bandarban", "Rangamati", "Khagrachhari", "Feni", "Noakhali", "Lakshmipur", "Cumilla", "Chandpur", "Brahmanbaria"],
  Rajshahi: ["Rajshahi", "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapainawabganj", "Pabna", "Sirajganj"],
  Khulna: ["Khulna", "Bagerhat", "Satkhira", "Jashore", "Jhenaidah", "Magura", "Narail", "Kushtia", "Chuadanga", "Meherpur"],
  Barishal: ["Barishal", "Barguna", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur"],
  Sylhet: ["Sylhet", "Habiganj", "Moulvibazar", "Sunamganj"],
  Rangpur: ["Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat", "Nilphamari", "Panchagarh", "Thakurgaon"],
  Mymensingh: ["Mymensingh", "Jamalpur", "Netrokona", "Sherpur"],
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const STATES: GeoRow[] = Object.keys(DIVISIONS).map((name, i) => ({ id: 12 + i, name, slug: slug(name), country: 126 }));

export const CITIES: GeoRow[] = Object.entries(DIVISIONS).flatMap(([division, names]) => {
  const state = STATES.find((s) => s.name === division)!;
  return names.map((name) => ({ id: 8000 + 1, name, slug: slug(name), country: 126, state: state.id }));
}).map((city, i) => ({ ...city, id: 8001 + i }));

const THANAS_BY_CITY: Record<string, string[]> = {
  Dhaka: ["Dhanmondi", "Gulshan", "Mirpur", "Mohammadpur", "Uttara", "Motijheel", "Tejgaon", "Banani"],
  Chattogram: ["Kotwali", "Pahartali", "Panchlaish", "Double Mooring"],
  Feni: ["Feni Sadar", "Daganbhuiyan", "Chhagalnaiya"],
  Sylhet: ["Sylhet Sadar", "Jalalabad", "Moglabazar"],
};

export const THANAS: GeoRow[] = Object.entries(THANAS_BY_CITY).flatMap(([cityName, names]) => {
  const city = CITIES.find((c) => c.name === cityName)!;
  return names.map((name) => ({ id: 0, name, slug: slug(name), country: 126, state: city.state, city: city.id }));
}).map((thana, i) => ({ ...thana, id: 40 + i }));
