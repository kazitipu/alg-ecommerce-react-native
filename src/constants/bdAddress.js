/**
 * Bangladesh division and district data, extracted from the
 * `@bangladeshi/bangladesh-address` package the web app depended on.
 *
 * The package is a React-web module, so only its data is carried over. Thana
 * lists live in `thana.js`, and delivery *areas* — the ones RedX needs an id
 * for — are fetched live from RedX per district.
 *
 * 8 divisions, 64 districts.
 */

export const DIVISIONS = [
  "Barisal",
  "Chattogram",
  "Dhaka",
  "Mymensingh",
  "Khulna",
  "Rajshahi",
  "Rangpur",
  "Sylhet"
];

export const DISTRICTS_BY_DIVISION = {
  "Barisal": [
    "Barguna",
    "Barisal",
    "Bhola",
    "Jhalokati",
    "Patuakhali",
    "Pirojpur"
  ],
  "Chattogram": [
    "Bandarban",
    "Brahmanbaria",
    "Chandpur",
    "Chattogram",
    "Comilla",
    "Cox's Bazar",
    "Feni",
    "Khagrachari",
    "Lakshmipur",
    "Noakhali",
    "Rangamati"
  ],
  "Dhaka": [
    "Dhaka",
    "Faridpur",
    "Gazipur",
    "Gopalganj",
    "Kishoreganj",
    "Madaripur",
    "Manikganj",
    "Munshiganj",
    "Narayanganj",
    "Narsingdi",
    "Rajbari",
    "Shariatpur",
    "Tangail"
  ],
  "Mymensingh": [
    "Jamalpur",
    "Mymensingh",
    "Netrokona",
    "Sherpur"
  ],
  "Khulna": [
    "Bagerhat",
    "Chuadanga",
    "Jessore",
    "Jhenaidah",
    "Khulna",
    "Kushtia",
    "Magura",
    "Meherpur",
    "Narail",
    "Satkhira"
  ],
  "Rajshahi": [
    "Bogra",
    "Joypurhat",
    "Naogaon",
    "Natore",
    "Nawabganj",
    "Pabna",
    "Rajshahi",
    "Sirajgonj"
  ],
  "Rangpur": [
    "Dinajpur",
    "Gaibandha",
    "Kurigram",
    "Lalmonirhat",
    "Nilphamari",
    "Panchagarh",
    "Rangpur",
    "Thakurgaon"
  ],
  "Sylhet": [
    "Habiganj",
    "Maulvibazar",
    "Sunamganj",
    "Sylhet"
  ]
};

export const districtsOf = division => DISTRICTS_BY_DIVISION[division] || [];

export default { DIVISIONS, DISTRICTS_BY_DIVISION, districtsOf };
