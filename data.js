// Reels Recommendation Agent - Dataset Definition

/**
 * 8 Fictional/Anonymized Reels that the student scrolls through.
 * Covers entertainment, gaming, coding, AI, gadgets, career, memes, and tech news.
 * Includes real-world, embed-enabled YouTube Video IDs.
 */
const INPUT_REELS = [
  {
    id: "reel_java_meme",
    title: "Introduction to Computer Science & Coding",
    creator: "programming_with_mosh",
    duration: 15,
    youtube_id: "8JJ101D3knE",
    thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=120&auto=format&fit=crop",
    description: "Welcome to CS50! An entry-level introduction to variables, conditions, loops, and software compilation.",
    transcript: "Welcome to CS50! This course is about computational thinking and problem-solving. We will explore how computers represent values, run statements sequentially, compile source code, and run programs in memory.",
    visuals: "Harvard lecture hall, interactive whiteboard, animations showing binary numbers converting to ASCII characters.",
    category_weights: {
      "Career": 0.8,
      "Java": 0.2,
      "Entertainment": 0.3
    },
    tags: ["mosh", "programming", "intro", "computer-science", "basics"]
  },
  {
    id: "reel_swe_lifestyle",
    title: "But what is a Neural Network? (ML Basics)",
    creator: "3blue1brown",
    duration: 45,
    youtube_id: "aircAruvnKk",
    thumbnail: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=120&auto=format&fit=crop",
    description: "A beautiful mathematical visualization explaining artificial neurons, layers, and weights.",
    transcript: "Let's demystify neural networks. We look at connected layers of nodes representing activation weights. Signals pass from inputs to outputs, mathematically extracting patterns.",
    visuals: "Network graphs of connected neurons lighting up layer-by-layer as hand-written digits are recognized.",
    category_weights: {
      "AI": 0.9,
      "Career": 0.1,
      "Entertainment": 0.2
    },
    tags: ["ai", "machine-learning", "neural-networks", "3blue1brown", "math"]
  },
  {
    id: "reel_interview_joke",
    title: "The Dynamic Programming Course",
    creator: "neetcode",
    duration: 30,
    youtube_id: "73r3KWiEvyk",
    thumbnail: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=120&auto=format&fit=crop",
    description: "A breakdown of dynamic programming algorithms and recursive optimizations for coding interviews.",
    transcript: "Why rewrite solutions to overlapping subproblems? Memoization caches values in a hash map, dropping recursion time from exponential O(2^N) to linear O(N)!",
    visuals: "Split screens illustrating recursion trees pruning redundant branches and populating memo tables.",
    category_weights: {
      "DSA": 0.7,
      "Career": 0.5,
      "Entertainment": 0.5
    },
    tags: ["dsa", "interview", "leetcode", "neetcode", "dynamic-programming"]
  },
  {
    id: "reel_laptop_review",
    title: "Git Explained in 100 Seconds",
    creator: "fireship",
    duration: 60,
    youtube_id: "hwC7j1N1S_Y",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=120&auto=format&fit=crop",
    description: "Learn version control, git commits, branching, and merges in under two minutes.",
    transcript: "Git is a distributed version control system. It tracks code modifications in snapshots called commits. Learn how to merge features into the main production branch safely.",
    visuals: "Interactive branch animations showing commits branching, rebasing, and merging.",
    category_weights: {
      "DSA": 0.9,
      "Career": 0.2,
      "Hardware": 0.1
    },
    tags: ["dsa", "git", "version-control", "fireship", "scaling"]
  },
  {
    id: "reel_ai_hype",
    title: "Docker in 100 Seconds",
    creator: "fireship",
    duration: 20,
    youtube_id: "Gjnup-PuquQ",
    thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop",
    description: "Understand application containerization, Dockerfiles, and runtime environments.",
    transcript: "Docker isolates code into portable containers. Learn how to bundle dependencies, construct microservice images, and run identical instances on dev and prod environments.",
    visuals: "Cute shipping container cartoons loading code layers, shipping to web servers.",
    category_weights: {
      "Entertainment": 0.9,
      "AI": 0.1
    },
    tags: ["ai", "docker", "containers", "fireship", "devops"]
  },
  {
    id: "reel_security",
    title: "Running an SQL Injection Attack",
    creator: "computerphile",
    duration: 25,
    youtube_id: "_J37_E-i2lCU",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=120&auto=format&fit=crop",
    description: "An educational demonstration showing how database vulnerabilities are exploited.",
    transcript: "Learn how hackers inject special database commands into web forms to extract complete usernames and passwords. SQL injection shows why sanitizing inputs is critical.",
    visuals: "Computer terminals executing SQL scripts, highlighting parameter overrides.",
    category_weights: {
      "Cybersecurity": 0.8,
      "Entertainment": 0.4
    },
    tags: ["hacking", "cybersecurity", "sql-injection", "computerphile", "database"]
  },
  {
    id: "reel_cloud",
    title: "Kubernetes Explained in 100 Seconds",
    creator: "fireship",
    duration: 40,
    youtube_id: "PziYflu8cB8",
    thumbnail: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=120&auto=format&fit=crop",
    description: "How to orchestrate and autoscale hundreds of container nodes seamlessly.",
    transcript: "Managing multiple containers is hard. Kubernetes orchestrates them, handling rollouts, auto-healing crashed pods, load balancing, and scaling your microservice architecture.",
    visuals: "AWS dashboard animations showing server nodes scaling up and down automatically.",
    category_weights: {
      "Cloud": 0.8,
      "Career": 0.3,
      "Entertainment": 0.2
    },
    tags: ["cloud", "kubernetes", "devops", "fireship", "scaling"]
  },
  {
    id: "reel_gaming",
    title: "Can I Speedrun Coding a Minecraft Clone in 5 Minutes?",
    creator: "javidx9",
    duration: 35,
    youtube_id: "vsLBErLWBhA",
    thumbnail: "https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?w=120&auto=format&fit=crop",
    description: "Attempting to build voxel engines using pure C++ and OpenGL. Speedrun challenge!",
    transcript: "Five minutes on the clock. We set up the window context, compile the vertex shader, generate block meshes, and use octree traversal for rapid voxel raycasting. Minecraft blocks are loading!",
    visuals: "Furious typing, side-by-side timer ticking down, wireframe blocks rendering on a window.",
    category_weights: {
      "Gaming": 0.8,
      "DSA": 0.3,
      "Entertainment": 0.4
    },
    tags: ["gaming", "game-dev", "minecraft", "speedrun", "opengl"]
  }
];

const RECOMMENDED_LIBRARY = [
  {
    id: "rec_hld_netflix",
    title: "System Design: Design YouTube",
    creator: "bytebytego",
    youtube_id: "vB7n4sZp-J0",
    thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop",
    transcript: "Designing YouTube requires high-throughput video transcoding pipelines. Learn how chunk uploading, video file fragmentation, CDNs (Content Delivery Networks), and adaptive bitrate streaming keep videos streaming smoothly.",
    category: "HLD",
    difficulty: "Intermediate",
    confidence_score: "High",
    relevance_vector: { "HLD": 0.9, "Career": 0.4 },
    learning_outcome: "Understand CDNs, latency reduction, and video transcoding architecture."
  },
  {
    id: "rec_hld_databases",
    title: "7 Database Paradigms in 100 Seconds",
    creator: "fireship",
    youtube_id: "sO7t1oJ62nE",
    thumbnail: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=120&auto=format&fit=crop",
    transcript: "Relational, Document, Key-Value, Graph, Wide-Column, Time-Series, and Vector. Learn when to use SQL vs NoSQL, and how graph databases map complex relationships.",
    category: "HLD",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "HLD": 0.8, "Cloud": 0.3 },
    learning_outcome: "Select appropriate database paradigms based on application scale and data schemas."
  },
  {
    id: "rec_hld_loadbalancer",
    title: "SQL Explained in 100 Seconds",
    creator: "fireship",
    youtube_id: "zsIyZw-umWQ",
    thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=120&auto=format&fit=crop",
    transcript: "Learn Structured Query Language (SQL) basics, database tables, primary keys, relational joins, and database indexes in under two minutes.",
    category: "HLD",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "HLD": 0.7, "Cloud": 0.5 },
    learning_outcome: "Write simple relational database queries and configure basic table indexes."
  },
  {
    id: "rec_dsa_big_o",
    title: "Linear Algebra Essence",
    creator: "3blue1brown",
    youtube_id: "fNk_zzaMoEs",
    thumbnail: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=120&auto=format&fit=crop",
    transcript: "Understand the geometric meaning of vectors, matrix transformations, determinants, dot products, and eigenvalues. Essential math for 3D game engines and machine learning.",
    category: "DSA",
    difficulty: "Intermediate",
    confidence_score: "High",
    relevance_vector: { "DSA": 0.9, "Career": 0.3 },
    learning_outcome: "Visualize matrix multiplications and compute vector spaces geometrically."
  },
  {
    id: "rec_dsa_dynamic_prog",
    title: "Dijkstra's Shortest Path Algorithm",
    creator: "computerphile",
    youtube_id: "GazC3A4OQTE",
    thumbnail: "https://images.unsplash.com/photo-1516116211223-4c359a36beec?w=120&auto=format&fit=crop",
    transcript: "How do maps calculate shortest routes? Dijkstra's algorithm tracks shortest paths to unvisited nodes recursively, updating neighbor estimates in graph structures.",
    category: "DSA",
    difficulty: "Advanced",
    confidence_score: "Medium",
    relevance_vector: { "DSA": 0.9, "Career": 0.6 },
    learning_outcome: "Trace Dijkstra's shortest path steps in weighted routing graphs."
  },
  {
    id: "rec_dsa_graphs",
    title: "Turing Machines & Computability",
    creator: "computerphile",
    youtube_id: "dNRDvLACg5Q",
    thumbnail: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=120&auto=format&fit=crop",
    transcript: "Explore how Alan Turing modeled computing using infinite tapes and state tables. Introduces the Halting Problem, mathematical state machines, and limits of algorithms.",
    category: "DSA",
    difficulty: "Advanced",
    confidence_score: "High",
    relevance_vector: { "DSA": 0.9 },
    learning_outcome: "Understand theoretical Turing machines, state tables, and unsolvable halting problems."
  },
  {
    id: "rec_java_garbage",
    title: "JavaScript in 100 Seconds",
    creator: "fireship",
    youtube_id: "DHjqpvDnNGE",
    thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=120&auto=format&fit=crop",
    transcript: "Learn JavaScript fundamentals, single-threaded event loop execution, async callbacks, promises, and browser scripting engine mechanics.",
    category: "Java",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "Java": 0.8, "Career": 0.4 },
    learning_outcome: "Explain asynchronous execution, callbacks, and event loops in scripting languages."
  },
  {
    id: "rec_java_multithread",
    title: "Python in 100 Seconds",
    creator: "fireship",
    youtube_id: "x7X9w_GIm1s",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=120&auto=format&fit=crop",
    transcript: "Learn Python syntax, dynamic typing, package imports, indentation blocks, and scripting capabilities in under two minutes.",
    category: "Java",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "Java": 0.7, "AI": 0.5 },
    learning_outcome: "Write simple Python functions and parse modular package modules."
  },
  {
    id: "rec_ai_neural_net",
    title: "How Neural Networks Actually Learn",
    creator: "3blue1brown",
    youtube_id: "Ilg3gGewQ5U",
    thumbnail: "https://images.unsplash.com/photo-1677442136019-21780efad99a?w=120&auto=format&fit=crop",
    transcript: "Neural networks aren't magic—they are math. They consist of layers of weights and biases. When an image of a handwritten '3' is passed, the network makes a guess. We compute the error (the 'loss') and use backpropagation with calculus to adjust the weights in the opposite direction of the gradient. This gradient descent is how computers learn patterns.",
    category: "AI",
    difficulty: "Intermediate",
    confidence_score: "High",
    relevance_vector: { "AI": 0.9 },
    learning_outcome: "Understand the mathematical principles of gradient descent, backpropagation, and loss functions."
  },
  {
    id: "rec_ai_embeddings",
    title: "Bitcoin and Blockchains Explained",
    creator: "3blue1brown",
    youtube_id: "bBC-nXj3M40",
    thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=120&auto=format&fit=crop",
    transcript: "How do cryptocurrencies work? Explore private keys, digital signatures, ledger synchronization, hashing proof-of-work protocols, and blockchain ledgers.",
    category: "AI",
    difficulty: "Intermediate",
    confidence_score: "High",
    relevance_vector: { "AI": 0.8, "DSA": 0.3 },
    learning_outcome: "Understand cryptographic proof-of-work, digital hashes, and secure distributed ledger systems."
  },
  {
    id: "rec_cloud_docker",
    title: "JavaScript Programming Crash Course",
    creator: "traversy_media",
    youtube_id: "hdI2bqOjy3c",
    thumbnail: "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=120&auto=format&fit=crop",
    transcript: "A comprehensive developer course for learning modern JavaScript features including variables, arrays, DOM interactions, fetch APIs, and event handling.",
    category: "Cloud",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "Cloud": 0.7, "Career": 0.4 },
    learning_outcome: "Design interactive frontend features and retrieve data using REST APIs."
  },
  {
    id: "rec_cloud_kubernetes",
    title: "Learn Python Programming: Course for Beginners",
    creator: "freecodecamp",
    youtube_id: "rfscVS0vtbw",
    thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=120&auto=format&fit=crop",
    transcript: "A complete programming bootcamp covering core Python syntax, class models, object creation, file reading/writing, and basic application scripts.",
    category: "Cloud",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "Cloud": 0.6, "Career": 0.5 },
    learning_outcome: "Implement clean scripts, file parsers, and object-oriented architectures in Python."
  },
  {
    id: "rec_cyber_sql_injection",
    title: "Public Key Cryptography & Encryption",
    creator: "computerphile",
    youtube_id: "GSIDS_lvRv4",
    thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=120&auto=format&fit=crop",
    transcript: "When you visit an HTTPS site, how is your connection private? It uses Asymmetric Cryptography. You have two keys: a Public Key (given to everyone to encrypt messages) and a Private Key (kept secret to decrypt). If Bob encrypts a message with Alice's public key, only Alice's private key can read it. This is the foundation of SSL/TLS handshakes.",
    category: "Cybersecurity",
    difficulty: "Intermediate",
    confidence_score: "High",
    relevance_vector: { "Cybersecurity": 0.9 },
    learning_outcome: "Differentiate between public and private keys in encrypting web sessions."
  },
  {
    id: "rec_cyber_asymmetric",
    title: "SQL Injection Demo & Attack Analysis",
    creator: "computerphile",
    youtube_id: "ciNHn38EyRc",
    thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=120&auto=format&fit=crop",
    transcript: "A visual walk-through showing how a web form vulnerable to SQL injection parses text inputs as query commands, dumping confidential account records.",
    category: "Cybersecurity",
    difficulty: "Intermediate",
    confidence_score: "High",
    relevance_vector: { "Cybersecurity": 0.9, "Career": 0.3 },
    learning_outcome: "Explain database injection exploits and implement prepared input query guards."
  },
  {
    id: "rec_hardware_cpu_cache",
    title: "What is System RAM? (Random Access Memory)",
    creator: "techquickie",
    youtube_id: "PVcv6yYKNWw",
    thumbnail: "https://images.unsplash.com/photo-1601524909162-be87252be298?w=120&auto=format&fit=crop",
    transcript: "Learn how random access memory provides speed caches for active application binaries, contrasting RAM cycles against slower storage storage configurations.",
    category: "Hardware",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "Hardware": 0.9, "DSA": 0.3 },
    learning_outcome: "Understand memory registers, read-write cycles, and basic memory management speeds."
  },
  {
    id: "rec_career_clean_code",
    title: "What is an SSD? (Solid State Drive)",
    creator: "techquickie",
    youtube_id: "YQEjyDGvHy8",
    thumbnail: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=120&auto=format&fit=crop",
    transcript: "Understand flash memory controllers, solid-state drive read speeds, write cycle wearing, and how modern SSD storage differs from classic spinning disk drives.",
    category: "Career",
    difficulty: "Beginner",
    confidence_score: "High",
    relevance_vector: { "Career": 0.9 },
    learning_outcome: "Explain Solid State storage speeds, block writing limits, and device reliability."
  }
];

const PRESETS = {
  "built_in_trap": {
    name: "Built-in Trap (Shallow vs. Deep Interest)",
    description: "Watches programming tutorials, a developer tool guide, and a Java script intro. Our agent should infer Software Engineering & Career interest, recommending HLD or DSA concepts.",
    history: [
      {
        reel_id: "reel_java_meme",
        watch_time: 15,
        liked: true,
        saved: false,
        shared: false,
        loops: 2,
        comment: "This is literally me every single morning."
      },
      {
        reel_id: "reel_swe_lifestyle",
        watch_time: 40,
        liked: false,
        saved: true,
        shared: false,
        loops: 1,
        comment: ""
      },
      {
        reel_id: "reel_interview_joke",
        watch_time: 30,
        liked: true,
        saved: true,
        shared: true,
        loops: 1,
        comment: "Dreading my Leetcode interview tomorrow, omg."
      },
      {
        reel_id: "reel_laptop_review",
        watch_time: 60,
        liked: false,
        saved: false,
        shared: true,
        loops: 1,
        comment: "Thermal scaling and complexity limits look crazy."
      }
    ]
  },
  "ai_engineer": {
    name: "AI & ML Explorer",
    description: "The student spends their session watching neural network vids and ML basics. They skip command-line guides immediately. The agent should recommend AI vector embeddings or dynamic programming.",
    history: [
      {
        reel_id: "reel_swe_lifestyle",
        watch_time: 45,
        liked: true,
        saved: true,
        shared: true,
        loops: 2,
        comment: "Neural network backprop calculus is incredible."
      },
      {
        reel_id: "reel_java_meme",
        watch_time: 2,
        liked: false,
        saved: false,
        shared: false,
        loops: 1,
        comment: "Too basic."
      }
    ]
  },
  "hardware_cloud": {
    name: "Sysadmin & Infrastructure Enthusiast",
    description: "Watches the system complexity and scaling benchmarks. The system should infer high interest in Cloud Infrastructure, System Design, and Hardware, recommending Kubernetes or CPU Cache optimization.",
    history: [
      {
        reel_id: "reel_laptop_review",
        watch_time: 60,
        liked: true,
        saved: true,
        shared: false,
        loops: 2,
        comment: "Performance complexity scaling is key."
      },
      {
        reel_id: "reel_java_meme",
        watch_time: 5,
        liked: false,
        saved: false,
        shared: false,
        loops: 1,
        comment: ""
      }
    ]
  }
};

// Export to window object for browser access
if (typeof window !== "undefined") {
  window.INPUT_REELS = INPUT_REELS;
  window.RECOMMENDED_LIBRARY = RECOMMENDED_LIBRARY;
  window.PRESETS = PRESETS;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { INPUT_REELS, RECOMMENDED_LIBRARY, PRESETS };
}
