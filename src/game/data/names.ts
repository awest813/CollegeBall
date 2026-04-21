/**
 * Player name database adapted from CFHC (https://github.com/awest813/CFHC).
 *
 * CFHC carries ~3,500 first names and ~3,600 last names used to procedurally
 * generate realistic college-athlete names across its career-mode seasons.
 * Here we use a curated 300-name subset of each list that is representative
 * of the full distribution.
 */

export const FIRST_NAMES: string[] = [
  "Chris", "Brandon", "Matt", "Mike", "John", "Ryan", "Josh", "Michael", "Justin", "David",
  "Nick", "Brian", "Kevin", "James", "Marcus", "Kyle", "Anthony", "Jason", "Joe", "Eric",
  "Tyler", "Jordan", "Andrew", "Adam", "Aaron", "Alex", "Jonathan", "Robert", "Jake", "Zach",
  "Mark", "Sean", "Jeff", "Sam", "Austin", "Ben", "Jeremy", "Will", "Tony", "Nate",
  "Tim", "Travis", "Patrick", "Greg", "Daniel", "Scott", "Jacob", "Chad", "Corey", "Steve",
  "Derrick", "Brad", "Luke", "Paul", "Charles", "Isaiah", "Christian", "Thomas", "Cameron", "Jon",
  "Bryan", "Jared", "Reggie", "Derek", "Blake", "Cole", "Jalen", "Chase", "Drew", "Trey",
  "Dan", "Jack", "Malik", "William", "George", "Maurice", "Stephen", "Andre", "Keith", "Steven",
  "Brett", "Richard", "Willie", "Andy", "Antonio", "Caleb", "Cedric", "Evan", "Nathan", "Bobby",
  "Ray", "Devin", "Elijah", "Joel", "Danny", "Jesse", "Xavier", "Cody", "Jay", "Larry",
  "Jermaine", "Lance", "Shane", "Tommy", "Tre", "Curtis", "Grant", "Noah", "Darius", "Erik",
  "Matthew", "Brent", "Bryce", "Craig", "Isaac", "Johnny", "Dustin", "Garrett", "Joey", "Joseph",
  "Lawrence", "Pat", "Ricky", "Tyrone", "Hunter", "Jeremiah", "Jimmy", "Kenny", "Shawn", "Dylan",
  "Fred", "Jamal", "Lee", "Todd", "Troy", "Logan", "Terry", "Trevor", "Victor", "Calvin",
  "Carlos", "Connor", "Cory", "Eddie", "Frank", "Gary", "Shaun", "Tom", "Ty", "Billy",
  "Charlie", "Darrell", "Doug", "Dwayne", "Rodney", "Taylor", "Terrance", "Terrell", "Joshua", "Seth",
  "Adrian", "Casey", "Julian", "Ken", "Randy", "Rob", "Micah", "Tanner", "Clint", "Dominic",
  "Emmanuel", "Gabe", "Jerome", "Kenneth", "Myles", "Carl", "Jamaal", "Kendall", "Ross", "Cam",
  "Courtney", "Jim", "Leon", "Marvin", "Mason", "Ron", "Terrence", "Trent", "Allen", "Antoine",
  "Dalton", "Darren", "Darryl", "Demetrius", "Dominique", "Henry", "Jerry", "Lamar", "Parker", "Phil",
  "Phillip", "Ronald", "Wesley", "Dennis", "Quinton", "Spencer", "Vincent", "Walter", "Albert", "Dave",
  "Donald", "Gerald", "Jamie", "Kris", "Max", "Alan", "Brady", "Deon", "Ian", "Kelvin",
  "Lorenzo", "Marques", "Martin", "Ronnie", "Shannon", "Trevon", "Vince", "Zac", "Avery", "Bo",
  "Brendan", "Bruce", "Darnell", "Devon", "Donovan", "Ed", "Freddie", "Gavin", "Johnathan", "Khalil",
  "Peter", "Rashad", "Riley", "Tyrell", "Alec", "Bill", "Collin", "Colton", "Ernest", "Jackson",
  "Jamar", "Jaylon", "Mario", "Melvin", "Wyatt", "Antwan", "Beau", "Bryson", "Clay", "Damon",
  "Denzel", "Desmond", "Donnie", "Jaylen", "Kellen", "Marquis", "Preston", "Raymond", "Roderick", "Roger",
  "Tyree", "Amir", "Bryant", "Chandler", "Dallas", "Dorian", "Eli", "Jarrod", "Javon", "Kaleb",
  "Kirk", "Kurt", "Lionel", "Marlon", "Pete", "Randall", "Rick", "Roy", "Stanley", "Tristan",
  "Brock", "Chauncey", "Chuck", "Clayton", "Colin", "Damien", "Dante", "Harrison", "Hayden", "Julius",
];

export const LAST_NAMES: string[] = [
  "Johnson", "Williams", "Smith", "Jones", "Brown", "Davis", "Jackson", "Thomas", "Harris", "Robinson",
  "Moore", "Wilson", "Miller", "Anderson", "White", "Thompson", "Carter", "Hall", "Allen", "Taylor",
  "Lewis", "Young", "Green", "Washington", "Hill", "Scott", "Walker", "Wright", "Mitchell", "Edwards",
  "Clark", "Adams", "Martin", "Brooks", "Butler", "Turner", "Baker", "James", "Bell", "Bryant",
  "Sanders", "Stewart", "Bailey", "King", "Richardson", "Parker", "Evans", "Henderson", "Lee", "Rogers",
  "Woods", "Coleman", "Daniels", "Nelson", "Phillips", "Roberts", "Alexander", "Campbell", "Gray", "Morris",
  "Simmons", "Ross", "Cook", "Cooper", "Ford", "Foster", "Jordan", "Harrison", "Jenkins", "Griffin",
  "Hayes", "Perry", "Bennett", "Collins", "Oliver", "Watson", "Barnes", "Hawkins", "Hughes", "Cox",
  "Marshall", "Murphy", "Ward", "Holmes", "Stephens", "Tucker", "Wade", "Webb", "Dixon", "Douglas",
  "Franklin", "Hicks", "Howard", "Kelly", "Owens", "Reed", "Reid", "Sims", "Gibson", "Hamilton",
  "Morgan", "Wallace", "Henry", "Joseph", "Long", "Mason", "Patterson", "Porter", "Sullivan", "Andrews",
  "Banks", "Ferguson", "Freeman", "Graham", "Hunter", "Matthews", "Robertson", "Warren", "Willis", "Fields",
  "Love", "Palmer", "Riley", "Austin", "Boyd", "Bush", "Cole", "Greene", "Jefferson", "Mack",
  "Payne", "Powell", "Price", "Crawford", "Cunningham", "Harper", "Harrell", "Harvey", "Haynes", "Hines",
  "Hudson", "Montgomery", "Moss", "Neal", "Russell", "Watkins", "West", "Bonner", "Burns", "Fisher",
  "Grant", "Peterson", "Shaw", "Tyler", "Dawson", "Fuller", "Garcia", "Jacobs", "Lane", "Mills",
  "Parks", "Perkins", "Rodgers", "Ryan", "Singleton", "Arnold", "Berry", "Bradley", "Lawrence", "Myers",
  "Reese", "Rice", "Sutton", "Tate", "Vaughn", "Walton", "Wood", "Armstrong", "Ball", "Barrett",
  "Bates", "Beck", "Black", "Brewer", "Burton", "Calhoun", "Dunn", "Flowers", "Gardner", "Hampton",
  "Hart", "Holt", "Houston", "Hunt", "Ingram", "Little", "Murray", "Patrick", "Pierce", "Pittman",
  "Roberson", "Simpson", "Stanley", "Terry", "Weaver", "Weber", "Booker", "Chambers", "Charles", "Cleveland",
  "Ellis", "Fox", "Holland", "Hubbard", "Jennings", "Pollard", "Richards", "Stevenson", "Townsend", "Williamson",
  "Byrd", "Carpenter", "Chandler", "Frazier", "George", "Glover", "Gonzalez", "Gordon", "Hardy", "Malone",
  "Manning", "Mathis", "Miles", "Monroe", "Newman", "Newsome", "Newton", "Patton", "Peters", "Reynolds",
  "Rhodes", "Richard", "Vincent", "Watts", "Wheeler", "Whitaker", "Atkins", "Avery", "Battle", "Bowen",
  "Carroll", "Clarke", "Clayton", "Collier", "Daniel", "Davidson", "Gaines", "Gates", "Herring", "Higgins",
  "Holley", "Hopkins", "Howell", "Huff", "Keyes", "Lawson", "Leonard", "Logan", "Lowe", "Lucas",
  "Minor", "Moses", "Nichols", "Nixon", "Powers", "Quinn", "Ray", "Rose", "Spencer", "Wesley",
  "Alston", "Barnett", "Bradford", "Branch", "Britt", "Carr", "Christian", "Coley", "Crosby", "Curry",
  "Dickerson", "Dorsey", "Doyle", "Dukes", "Duncan", "Elliott", "Francis", "Garner", "Garrett", "Gibbs",
];

/** Pick a random entry from an array. */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick a random first name. */
export function randomFirstName(): string {
  return pickRandom(FIRST_NAMES);
}

/** Pick a random last name. */
export function randomLastName(): string {
  return pickRandom(LAST_NAMES);
}
