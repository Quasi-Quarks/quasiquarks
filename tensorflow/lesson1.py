"""
TensorFlow 2.x – Introduction Tutorial
Author: Khalid Umar
Description:
This script introduces TensorFlow tensors, their types, rank, shape,
reshaping, and slicing. It is beginner-friendly and suitable for
engineering students.
"""

# ===============================
# 1. Import TensorFlow
# ===============================
import tensorflow as tf

print("TensorFlow version:", tf.__version__)
print("-" * 50)

# ===============================
# 2. Creating Tensors
# ===============================
print("Creating tensors...")

string_tensor = tf.Variable("This is a string", dtype=tf.string)
integer_tensor = tf.Variable(324, dtype=tf.int16)
float_tensor = tf.Variable(3.567, dtype=tf.float64)

print("String tensor:", string_tensor)
print("Integer tensor:", integer_tensor)
print("Float tensor:", float_tensor)
print("-" * 50)

# ===============================
# 3. Rank (Degree) of Tensors
# ===============================
print("Tensor ranks...")

scalar = tf.Variable(10)  # Rank 0
rank1_tensor = tf.Variable(["Test"], dtype=tf.string)  # Rank 1
rank2_tensor = tf.Variable(
    [["test", "ok"],
     ["test", "yes"]],
    dtype=tf.string
)  # Rank 2

print("Scalar rank:", tf.rank(scalar).numpy())
print("Rank-1 tensor rank:", tf.rank(rank1_tensor).numpy())
print("Rank-2 tensor rank:", tf.rank(rank2_tensor).numpy())
print("-" * 50)

# ===============================
# 4. Shape of Tensors
# ===============================
print("Tensor shapes...")

print("Scalar shape:", scalar.shape)
print("Rank-1 tensor shape:", rank1_tensor.shape)
print("Rank-2 tensor shape:", rank2_tensor.shape)
print("-" * 50)

# ===============================
# 5. Reshaping Tensors
# ===============================
print("Reshaping tensors...")

tensor1 = tf.ones([1, 2, 3])        # Shape: (1, 2, 3)
tensor2 = tf.reshape(tensor1, [2, 3, 1])  # Shape: (2, 3, 1)
tensor3 = tf.reshape(tensor2, [3, -1])    # Shape: (3, 2)

print("Tensor1 shape:", tensor1.shape)
print(tensor1)

print("\nTensor2 shape:", tensor2.shape)
print(tensor2)

print("\nTensor3 shape:", tensor3.shape)
print(tensor3)
print("-" * 50)

# ===============================
# 6. Slicing Tensors
# ===============================
print("Slicing tensors...")

matrix = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20]
]

tensor = tf.Variable(matrix, dtype=tf.int32)

print("Tensor rank:", tf.rank(tensor).numpy())
print("Tensor shape:", tensor.shape)

# Element selection
element = tensor[0, 2]
print("Element at row 1, column 3:", element.numpy())

# Row selection
row1 = tensor[0]
print("First row:", row1.numpy())

# Column selection
column1 = tensor[:, 0]
print("First column:", column1.numpy())

# Multiple rows
rows_2_and_4 = tensor[1::2]
print("Second and fourth rows:\n", rows_2_and_4.numpy())

# Column from selected rows
column_from_rows = tensor[1:3, 0]
print("First column from rows 2 and 3:", column_from_rows.numpy())

print("-" * 50)
print("End of TensorFlow tutorial.")
