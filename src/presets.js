const presets = [
    {
        name: "print-zero",
        description: "Print \'0\'",
        program: "++++++++[>++++++<-]>.",
        inputs: "",
        outputAsDec: false,
    },
    {
        name: "hello-world",
        description: "Hello World!",
        program: "++++++++++[>+++++++>++++++++++>+++>+<<<<-]>++.>+.+++++++..+++.>++.<<+++++++++++++++.>.+++.------.--------.>+.>.",
        inputs: "",
        outputAsDec: false,
    },
    {
        name: "sum-to-n",
        description: "Sum 1 to n (n < 23)",
        program: ",[[>+>+<<-]>-[<+>-]<]>>.",
        inputs: "5",
        outputAsDec: true,
    },

];

export { presets };
